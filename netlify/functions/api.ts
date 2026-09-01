import serverless from "serverless-http";

import { createServer } from "../../server";

export default async (req: Request): Promise<Response> => {
