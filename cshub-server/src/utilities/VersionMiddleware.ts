import {app} from "../index";
import {Request, Response} from "express";
import logger from "../utilities/Logger";
import {readFileSync} from "fs";
import {ServerError} from "../../../cshub-shared/src/models/ServerError";

const SHA = JSON.parse(readFileSync("./package.json").toString())["gitSHA"];

app.use((req: Request, res: Response, next: Function) => {
    const headerVersion = req.header("Version");
    const versionMatch = SHA === headerVersion || typeof headerVersion === "undefined";

    const msg = versionMatch ? "Versions match" : "Version mismatch";

    if (!versionMatch) {
        logger.error(msg);
        res.status(500).send(new ServerError("There was a version mismatch between the server and client, this could mean you run an outdated version, which can be fixed by refreshing / force refreshing", true));
    } else {
        logger.verbose(msg);
        next();
    }

});
