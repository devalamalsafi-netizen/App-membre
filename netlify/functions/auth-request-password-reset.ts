import { handleRequestPasswordReset } from "../../server/routes/passwordReset";
import { runExpressHandler } from "./_shared/express-shim";

export const handler = async (event: Request): Promise<Response> => {
  return runExpressHandler(handleRequestPasswordReset, event);
};

export default handler;
