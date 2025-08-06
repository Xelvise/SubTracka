import { Router } from "express";
import { reminderScheduler, sendEmail } from "./controllers";
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
        body("info")
            .exists({ values: "falsy" })
            .withMessage("Body info is required")
            .isJSON()
            .withMessage("Invalid info"),
        validationResultHandler,
    ],
    verifyWebhook,
    sendEmail
);

export default route;
