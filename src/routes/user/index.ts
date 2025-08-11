import { Router } from "express";
import { verifyJWT } from "../../utils/middlewares";
import { validationResultHandler } from "../../utils/middlewares";
import { requiredBodyValidator } from "../../utils/middlewares";
import { changePassword, deleteUser, fetchAllUsers, fetchUserById, updateUsername } from "./controllers";
import { body } from "express-validator";
const route = Router();

route.get("/", verifyJWT, fetchAllUsers); // fetch all users

route.get("/:id", verifyJWT, fetchUserById); // fetch a single user details

route.put(
    "/:id/username",
    [
        requiredBodyValidator,
        body("username")
            .exists({ values: "falsy" })
            .withMessage("Username is required")
            .isString()
            .withMessage("Invalid Username")
            .isLength({ min: 2, max: 50 })
            .withMessage("Username must be within 2 - 50 characters long"),
        validationResultHandler,
    ],
    verifyJWT,
    updateUsername
);

route.put(
    "/:id/password",
    [
        requiredBodyValidator,
        body("old_password").exists({ values: "falsy" }).withMessage("Old password is required"),
        body("new_password")
            .exists({ values: "falsy" })
            .withMessage("New password is required")
            .isAlphanumeric()
            .withMessage("New password must be alphanumeric")
            .isLength({ min: 4, max: 50 })
            .withMessage("New password must be within 4 - 50 characters long"),
        validationResultHandler,
    ],
    verifyJWT,
    changePassword
);

route.delete("/:id", verifyJWT, deleteUser);

export default route;
