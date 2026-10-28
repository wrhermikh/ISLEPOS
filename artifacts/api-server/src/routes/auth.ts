import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { currentUserResponse, resolveStaffUser } from "./staff-access";

const router: IRouter = Router();

router.get("/auth/me", async (req, res): Promise<void> => {
  const staffUser = await resolveStaffUser(req, res);
  if (!staffUser) return;

  res.json(GetCurrentUserResponse.parse(currentUserResponse(staffUser)));
});

export default router;
