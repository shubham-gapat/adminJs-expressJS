"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const adminjs_1 = require("adminjs");
const express_1 = require("@adminjs/express");
const typeorm_1 = require("@adminjs/typeorm");
const express = require("express");
const typeorm_2 = require("typeorm");
const User_1 = require("./entity/User");
adminjs_1.default.registerAdapter({ Database: typeorm_1.Database, Resource: typeorm_1.Resource });
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    // Create TypeORM connection
    yield (0, typeorm_2.createConnection)();
    // Initialize AdminJS
    const admin = new adminjs_1.default({
        resources: [User_1.User],
        rootPath: '/admin',
    });
    const app = express();
    // Build and use AdminJS router
    const adminRouter = express_1.default.buildRouter(admin);
    app.use(admin.options.rootPath, adminRouter);
    app.listen(3000, () => {
        console.log('AdminJS is under localhost:3000/admin');
    });
});
run().catch(err => {
    console.error(err);
    process.exit(1);
});
