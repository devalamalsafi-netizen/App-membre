import { handleResetPassword } from "../../server/routes/passwordReset";
import { runExpressHandler } from "./_shared/express-shim";

export const handler = async (event: Request): Promise<Response> => {
  return runExpressHandler(handleResetPassword, event);
};

export default handler;
