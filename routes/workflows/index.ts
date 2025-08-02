import { Router } from "express";
import { sendReminders } from "./controllers";
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
    sendReminders
);

export default route;
