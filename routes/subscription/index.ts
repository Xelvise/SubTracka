import { Router } from "express";
import { verifyJWT } from "../../utils/middlewares";
import { validationResultHandler } from "../../utils/middlewares";
import { requiredBodyValidator } from "../../utils/middlewares";
// prettier-ignore
import { createSubscription, fetchSingleSubscription, fetchUserSubscriptions, updateSubscription } from "./controllers";
import { body, query } from "express-validator";
const route = Router();

route.get(
    "/",
    [
        query("orderBy", "Invalid orderBy param").isIn(["price", "startDate", "nextRenewalDate"]),
        query("sort", "Invalid sort param").isIn(["asc", "desc"]),
    ],
    verifyJWT,
    fetchUserSubscriptions
);

route.get("/:id", verifyJWT, fetchSingleSubscription);

route.post(
    "/create",
    [
        requiredBodyValidator,
        body("name")
            .exists({ values: "falsy" })
            .withMessage("Name is required")
            .isString()
            .withMessage("Invalid name")
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be within 2 - 50 characters long"),
        body("price")
            .exists({ values: "falsy" })
            .withMessage("Price is required")
            .isDecimal()
            .withMessage("Invalid price"),
        body("currency", "Invalid currency").isIn(["USD", "EUR", "GBP"]),
        body("frequency")
            .exists({ values: "falsy" })
            .withMessage("Frequency is required")
            .isIn(["daily", "weekly", "monthly", "yearly"])
            .withMessage("Invalid frequency"),
        body("category")
            .exists({ values: "falsy" })
            .withMessage("Category is required")
            .isIn(["sports", "news", "entertainment", "lifestyle", "technology", "finance", "politics", "other"])
            .withMessage("Invalid category"),
        body("payment_method", "Invalid Payment method").optional().isIn(["credit card", "paypal", "bitcoin"]),
        body("start_date", "Start date must be formatted as YYYY-MM-DD").optional().isDate({ format: "YYYY-MM-DD" }),
        validationResultHandler,
    ],
    verifyJWT,
    createSubscription
);

route.put(
    "/:id",
    [
        requiredBodyValidator,
        body("name")
            .exists({ values: "falsy" })
            .withMessage("Name is required")
            .isString()
            .withMessage("Invalid name")
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be within 2 - 50 characters long"),
        body("price")
            .exists({ values: "falsy" })
            .withMessage("Price is required")
            .isDecimal()
            .withMessage("Invalid price"),
        body("currency", "Invalid currency").isIn(["USD", "EUR", "GBP"]),
        body("category")
            .exists({ values: "falsy" })
            .withMessage("Category is required")
            .isIn(["sports", "news", "entertainment", "lifestyle", "technology", "finance", "politics", "other"])
            .withMessage("Invalid category"),
        body("payment_method", "Invalid Payment method").isIn(["credit card", "paypal", "bitcoin"]),
        validationResultHandler,
    ],
    verifyJWT,
    updateSubscription
);

// route.delete("/:id"); // delete subscription

// route.put("/:id/cancel"); // cancel subscription

// route.post("/upcoming-renewals"); // get upcoming renewals

export default route;
