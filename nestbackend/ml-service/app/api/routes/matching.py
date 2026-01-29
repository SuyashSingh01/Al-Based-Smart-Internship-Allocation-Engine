from fastapi import APIRouter, HTTPException, Depends
from typing import List
import time
from loguru import logger

from app.models.schemas import (
    MatchRequest, BatchMatchResponse, MatchResult,
    SingleMatchRequest, StudentProfile, InternshipOpportunity
)
from app.services.matching_engine import MatchingEngine
from app.core.model_manager import ModelManager
from app.main import model_manager

router = APIRouter()

def get_matching_engine() -> MatchingEngine:
    return MatchingEngine(model_manager)

@router.post("/batch", response_model=BatchMatchResponse)
async def batch_match(
    request: MatchRequest,
    engine: MatchingEngine = Depends(get_matching_engine)
):
    try:
        start_time = time.time()
        
        logger.info(f"Processing batch match for {len(request.students)} students and {len(request.internships)} internships")
        
        match_results = engine.batch_match(
            students=request.students,
            internships=request.internships,
            max_matches_per_student=request.max_matches_per_student,
            min_score=request.min_score_threshold,
            diversity_boost=request.diversity_boost
        )
        
        results = []
        total_matches = 0
        
        for student in request.students:
            matches = match_results.get(student.student_id, [])
            total_matches += len(matches)
            
            results.append(MatchResult(
                student_id=student.student_id,
                student_name=student.name,
                matches=matches,
                total_matches=len(matches)
            ))
        
        processing_time = time.time() - start_time
        
        logger.info(f"Batch matching completed in {processing_time:.2f}s. Generated {total_matches} matches")
        
        return BatchMatchResponse(
            results=results,
            total_students_processed=len(request.students),
            total_matches_generated=total_matches,
            processing_time_seconds=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error in batch matching: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/single", response_model=MatchResult)
async def single_match(
    request: SingleMatchRequest,
    engine: MatchingEngine = Depends(get_matching_engine)
):
    try:
        logger.info(f"Processing single match for student {request.student.student_id}")
        
        matches = engine.match_student_to_internships(
            student=request.student,
            internships=request.internships,
            max_matches=request.max_matches,
            min_score=0.0,
            diversity_boost=True
        )
        
        return MatchResult(
            student_id=request.student.student_id,
            student_name=request.student.name,
            matches=matches,
            total_matches=len(matches)
        )
        
    except Exception as e:
        logger.error(f"Error in single matching: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_allocation(
    students: List[StudentProfile],
    internships: List[InternshipOpportunity],
    diversity_boost: bool = True,
    engine: MatchingEngine = Depends(get_matching_engine)
):
    try:
        logger.info(f"Optimizing allocation for {len(students)} students")
        
        allocation = engine.optimize_allocation(
            students=students,
            internships=internships,
            diversity_boost=diversity_boost
        )
        
        return {
            "allocation": allocation,
            "total_allocated": len(allocation),
            "total_students": len(students),
            "allocation_rate": round(len(allocation) / len(students) * 100, 2) if students else 0
        }
        
    except Exception as e:
        logger.error(f"Error in optimization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
