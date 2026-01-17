import { object, string } from "yup";

export const createAdminSchema = object({

  username: string()
    .required("username is required")
    .email("Enter valid username"),
  password: string()
    .required("password is required")
    .min(8, "Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});
