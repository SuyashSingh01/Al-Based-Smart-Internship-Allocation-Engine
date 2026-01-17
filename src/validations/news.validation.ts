import { object, string, date } from "yup";

export const newsSchema = object({
  title: string()
    .required("Title is required")
    .min(5, "Title must be at least 5 characters long"),
  description: string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters long"),
  source: string().required("Source is required"),
  date: date().required("Date is required"),
  sourceLink: string().required("Source Link is required"),
});
