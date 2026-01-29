import numpy as np
from typing import List, Dict, Tuple
from loguru import logger
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict

from app.models.schemas import (
    StudentProfile, InternshipOpportunity, MatchScore,
    QualificationLevel, SocialCategory, DistrictType
)
from app.core.config import settings
from app.core.model_manager import ModelManager

class MatchingEngine:
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.qualification_hierarchy = {
            QualificationLevel.DIPLOMA: 1,
            QualificationLevel.UNDERGRADUATE: 2,
            QualificationLevel.POSTGRADUATE: 3,
            QualificationLevel.DOCTORATE: 4
        }
        
    def calculate_skill_score(
        self, 
        student_skills: List[str], 
        required_skills: List[str]
    ) -> Tuple[float, str]:
        try:
            student_embeddings = self.model_manager.encode_skills(student_skills)
            required_embeddings = self.model_manager.encode_skills(required_skills)
            
            similarity = cosine_similarity(student_embeddings, required_embeddings)[0][0]
            
            skill_overlap = set(s.lower() for s in student_skills) & set(r.lower() for r in required_skills)
            overlap_ratio = len(skill_overlap) / len(required_skills) if required_skills else 0
            
            final_score = (similarity * 0.7) + (overlap_ratio * 0.3)
            
            explanation = f"Semantic similarity: {similarity:.2f}, Direct overlap: {overlap_ratio:.2f}"
            
            return min(final_score, 1.0), explanation
            
        except Exception as e:
            logger.error(f"Error calculating skill score: {str(e)}")
            return 0.0, "Error in calculation"
    
    def calculate_qualification_score(
        self,
        student_qual: QualificationLevel,
        required_qual: QualificationLevel,
        student_cgpa: float,
        min_cgpa: float
    ) -> Tuple[float, str]:
        student_level = self.qualification_hierarchy[student_qual]
        required_level = self.qualification_hierarchy[required_qual]
        
        if student_level < required_level:
            qual_score = 0.5 * (student_level / required_level)
        elif student_level == required_level:
            qual_score = 1.0
        else:
            qual_score = 0.9
        
        if student_cgpa < min_cgpa:
            cgpa_score = 0.5 * (student_cgpa / min_cgpa) if min_cgpa > 0 else 0.5
        else:
            cgpa_score = min(student_cgpa / 10.0, 1.0)
        
        final_score = (qual_score * 0.6) + (cgpa_score * 0.4)
        
        explanation = f"Qualification match: {qual_score:.2f}, CGPA score: {cgpa_score:.2f}"
        
        return final_score, explanation
    
    def calculate_location_score(
        self,
        student_preferences: List[str],
        internship_location: str
    ) -> Tuple[float, str]:
        location_lower = internship_location.lower()
        preferences_lower = [p.lower() for p in student_preferences]
        
        if location_lower in preferences_lower:
            score = 1.0
            explanation = "Exact location match"
        elif any(pref in location_lower or location_lower in pref for pref in preferences_lower):
            score = 0.8
            explanation = "Partial location match"
        else:
            score = 0.3
            explanation = "No location match"
        
        return score, explanation
    
    def calculate_sector_score(
        self,
        student_interests: List[str],
        internship_sector: str
    ) -> Tuple[float, str]:
        sector_lower = internship_sector.lower()
        interests_lower = [i.lower() for i in student_interests]
        
        if sector_lower in interests_lower:
            score = 1.0
            explanation = "Exact sector match"
        elif any(interest in sector_lower or sector_lower in interest for interest in interests_lower):
            score = 0.7
            explanation = "Partial sector match"
        else:
            score = 0.2
            explanation = "No sector match"
        
        return score, explanation
    
    def calculate_diversity_score(
        self,
        student: StudentProfile,
        internship: InternshipOpportunity,
        diversity_boost: bool
    ) -> Tuple[float, str]:
        if not diversity_boost:
            return 0.5, "Diversity boost disabled"
        
        score = 0.5
        factors = []
        
        if student.social_category in [SocialCategory.SC, SocialCategory.ST, SocialCategory.OBC]:
            score += 0.2
            factors.append(f"Social category: {student.social_category.value}")
        
        if student.district_type in [DistrictType.RURAL, DistrictType.ASPIRATIONAL]:
            score += 0.2
            factors.append(f"District type: {student.district_type.value}")
        
        if student.past_internships == 0:
            score += 0.1
            factors.append("First-time applicant")
        
        explanation = ", ".join(factors) if factors else "No diversity factors"
        
        return min(score, 1.0), explanation
    
    def calculate_match_score(
        self,
        student: StudentProfile,
        internship: InternshipOpportunity,
        diversity_boost: bool = True
    ) -> MatchScore:
        skill_score, skill_exp = self.calculate_skill_score(
            student.skills, 
            internship.required_skills
        )
        
        qual_score, qual_exp = self.calculate_qualification_score(
            student.qualification,
            internship.preferred_qualification,
            student.cgpa,
            internship.min_cgpa
        )
        
        location_score, loc_exp = self.calculate_location_score(
            student.location_preference,
            internship.location
        )
        
        sector_score, sector_exp = self.calculate_sector_score(
            student.sector_interests,
            internship.sector
        )
        
        diversity_score, div_exp = self.calculate_diversity_score(
            student,
            internship,
            diversity_boost
        )
        
        overall_score = (
            skill_score * settings.SKILL_WEIGHT +
            qual_score * settings.QUALIFICATION_WEIGHT +
            location_score * settings.LOCATION_WEIGHT +
            sector_score * settings.SECTOR_WEIGHT +
            diversity_score * settings.DIVERSITY_WEIGHT
        )
        
        return MatchScore(
            student_id=student.student_id,
            internship_id=internship.internship_id,
            overall_score=round(overall_score, 4),
            skill_score=round(skill_score, 4),
            qualification_score=round(qual_score, 4),
            location_score=round(location_score, 4),
            sector_score=round(sector_score, 4),
            diversity_score=round(diversity_score, 4),
            explanation={
                "skills": skill_exp,
                "qualification": qual_exp,
                "location": loc_exp,
                "sector": sector_exp,
                "diversity": div_exp
            }
        )
    
    def match_student_to_internships(
        self,
        student: StudentProfile,
        internships: List[InternshipOpportunity],
        max_matches: int = 10,
        min_score: float = 0.5,
        diversity_boost: bool = True
    ) -> List[MatchScore]:
        available_internships = [
            i for i in internships 
            if i.filled_positions < i.capacity
        ]
        
        if not available_internships:
            logger.warning(f"No available internships for student {student.student_id}")
            return []
        
        matches = []
        for internship in available_internships:
            match_score = self.calculate_match_score(student, internship, diversity_boost)
            if match_score.overall_score >= min_score:
                matches.append(match_score)
        
        matches.sort(key=lambda x: x.overall_score, reverse=True)
        
        return matches[:max_matches]
    
    def batch_match(
        self,
        students: List[StudentProfile],
        internships: List[InternshipOpportunity],
        max_matches_per_student: int = 10,
        min_score: float = 0.5,
        diversity_boost: bool = True
    ) -> Dict[str, List[MatchScore]]:
        results = {}
        
        for student in students:
            matches = self.match_student_to_internships(
                student,
                internships,
                max_matches_per_student,
                min_score,
                diversity_boost
            )
            results[student.student_id] = matches
            
            logger.info(
                f"Student {student.student_id}: {len(matches)} matches found"
            )
        
        return results
    
    def optimize_allocation(
        self,
        students: List[StudentProfile],
        internships: List[InternshipOpportunity],
        diversity_boost: bool = True
    ) -> Dict[str, str]:
        all_matches = {}
        for student in students:
            matches = self.match_student_to_internships(
                student,
                internships,
                max_matches=len(internships),
                min_score=0.0,
                diversity_boost=diversity_boost
            )
            all_matches[student.student_id] = matches
        
        allocation = {}
        internship_capacity = {
            i.internship_id: i.capacity - i.filled_positions 
            for i in internships
        }
        
        unallocated_students = set(s.student_id for s in students)
        
        while unallocated_students:
            best_match = None
            best_score = -1
            
            for student_id in unallocated_students:
                if student_id not in all_matches or not all_matches[student_id]:
                    continue
                
                for match in all_matches[student_id]:
                    if internship_capacity.get(match.internship_id, 0) > 0:
                        if match.overall_score > best_score:
                            best_score = match.overall_score
                            best_match = (student_id, match.internship_id)
                        break
            
            if best_match is None:
                break
            
            student_id, internship_id = best_match
            allocation[student_id] = internship_id
            internship_capacity[internship_id] -= 1
            unallocated_students.remove(student_id)
        
        logger.info(f"Allocated {len(allocation)} out of {len(students)} students")
        
        return allocation
