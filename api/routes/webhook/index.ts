import { Router } from "express";
import { pingSupabase, pingUpstashRedis, reminderScheduler, sendEmail } from "./controllers";
import { requiredBodyValidator, validationResultHandler, verifyWebhook } from "../../utils/middlewares";
import { body } from "express-validator";
const route = Router();

route.post(
    "/subscription/reminder",
    [
        requiredBodyValidator,
        body("subId")
            .exists({ values: "falsy" })
            .withMessage("Subscription ID is required")
            .isString()
            .withMessage("Invalid subId"),
        validationResultHandler,
    ],
    verifyWebhook,
    reminderScheduler
);

route.post(
    "/subscription/send-email",
    [
        requiredBodyValidator,
        body("type")
            .exists({ values: "falsy" })
            .withMessage("Type is required")
            .isIn(["password-reset", "welcome"])
            .withMessage("Invalid type"),
        body("info").exists({ values: "falsy" }).withMessage("Body info is required"),
        validationResultHandler,
    ],
    verifyWebhook,
    sendEmail
);

route.get("/ping/supabase", pingSupabase);
route.get("/ping/upstash-redis", pingUpstashRedis);

export default route;
