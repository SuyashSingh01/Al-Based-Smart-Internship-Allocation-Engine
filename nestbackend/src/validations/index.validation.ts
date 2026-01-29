import { adminLoginSchema } from "./adminLogin.validation";
import { createAdminSchema } from "./createAdmin.validation";
import { userLoginSchema } from "./userlogin.validation";
import { userSignupSchema } from "./usersignup.validation";
import { newsSchema } from "./news.validation";
import { createSourceSchema } from "./source.validation";

export const schemas = {
  adminLogin: adminLoginSchema,
  createAdmin: createAdminSchema,
  userLogin: userLoginSchema,
  userSignup: userSignupSchema,
  news: newsSchema,
  createSource: createSourceSchema,
};
