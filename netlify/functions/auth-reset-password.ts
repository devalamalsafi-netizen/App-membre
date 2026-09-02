import { handleResetPassword } from "../../server/routes/passwordReset";
import { runExpressHandler } from "./_shared/express-shim";
export default async (req: Request): Promise<Response> => {
  return runExpressHandler(handleResetPassword, req);
};
