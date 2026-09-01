import { handleSendEmail } from "../../server/routes/email";
import { runExpressHandler } from "./_shared/express-shim";

export default async (req: Request): Promise<Response> => {
  return runExpressHandler(handleSendEmail, req);
};
