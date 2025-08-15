import { Router } from "express";
import {
    initiateLogin,
    initiateSignout,
    initiateSignup,
    initiatePasswordReset,
    resetPassword,
    refreshJWT,
} from "./controllers";
import { body } from "express-validator";
import { verifyJWT } from "../../utils/middlewares";
import { validationResultHandler } from "../../utils/middlewares";
import { requiredBodyValidator } from "../../utils/middlewares";
const route = Router();

route.post(
    "/signup",
    [
        requiredBodyValidator,
        body("username")
            .exists({ values: "falsy" })
            .withMessage("Username is required")
            .isString()
            .withMessage("Invalid username")
            .isLength({ min: 2, max: 50 })
            .withMessage("Username must be within 2 - 50 characters long"),
        body("email")
            .exists({ values: "falsy" })
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email address"),
        body("password")
            .exists({ values: "falsy" })
            .withMessage("Password is required")
            .isString()
            .withMessage("Invalid password")
            .isLength({ min: 8, max: 50 })
            .withMessage("Password must be within 8 - 50 characters long"),
        validationResultHandler,
    ],
    initiateSignup
);

route.post(
    "/login",
    [
        requiredBodyValidator,
        body("email")
            .exists({ values: "falsy" })
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email address"),
        body("password")
            .exists({ values: "falsy" })
            .withMessage("Password is required")
            .isString()
            .withMessage("Invalid password"),
        validationResultHandler,
    ],
    initiateLogin
);

route.get("/refresh-jwt", refreshJWT);

route.delete("/logout", verifyJWT, initiateSignout);

route.post(
    "/password/reset",
    [
        requiredBodyValidator,
        body("email")
            .exists({ values: "falsy" })
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Invalid email address"),
        validationResultHandler,
    ],
    initiatePasswordReset
);

route.post(
    "/:userId/password/reset/:resetToken",
    [
        requiredBodyValidator,
        body("new_password")
            .exists({ values: "falsy" })
            .withMessage("New password is required")
            .isString()
            .withMessage("Invalid new password")
            .isLength({ min: 8, max: 50 })
            .withMessage("New password must be within 8 - 50 characters long"),
        validationResultHandler,
    ],
    resetPassword
);

export default route;
