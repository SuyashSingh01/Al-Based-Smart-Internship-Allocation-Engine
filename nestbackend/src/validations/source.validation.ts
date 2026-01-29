import { object, string } from "yup";

export const createSourceSchema = object({
  title: string().required("title is required"),
  language: string().required("language is required"),
});
