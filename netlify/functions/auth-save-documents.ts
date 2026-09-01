import { handleSavePdfQrCode } from "../../server/routes/auth";
import { runExpressHandler } from "./_shared/express-shim";

export const handler = async (req: Request): Promise<Response> => {
  return runExpressHandler(handleSavePdfQrCode, req);
};
