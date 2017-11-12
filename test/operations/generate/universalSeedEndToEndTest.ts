import "mocha";
import * as assert from "power-assert";

import * as shell from "shelljs";
import * as tmp from "tmp-promise";

import axios from "axios";

import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { HandlerContext } from "../../../src/HandlerContext";
import { GitHubDotComBase, GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { UniversalSeed } from "../../../src/operations/generate/UniversalSeed";
import { NodeFsLocalProject } from "../../../src/project/local/NodeFsLocalProject";
import { hasFile } from "../../../src/util/gitHub";
import { GitHubToken } from "../../atomist.config";

const TargetRepo = `test-repo-${new Date().getTime()}`;
let TargetOwner = "johnsonr";

describe("Universal seed end to end", () => {

    before(done => {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        axios.get(`${GitHubDotComBase}/user`, config).then(response => {
            TargetOwner = response.data.login;
            done();
        });
    });

    afterEach(done => {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        const url = `${GitHubDotComBase}/repos/${TargetOwner}/${TargetRepo}`;
        axios.delete(url, config)
            .then(_ => {
                done();
            })
            .catch(err => {
                done();
            });
    });

    it("should create a new GitHub repo", function(done) {
        this.retries(5);

        const seed = new UniversalSeed();
        seed.targetOwner = TargetOwner;
        seed.targetRepo = TargetRepo;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(result => {
                assert(result.code === 0);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, TargetRepo, "pom.xml")
                    .then(r => {
                        assert(r);
                        done();
                    });
            }).catch(done);
    }).timeout(20000);

});

describe("Local project creation", () => {

    it("should create a new local project", done => {
        const cwd = tmp.dirSync().name;
        shell.cd(cwd);
        const seed = new UniversalSeed();
        seed.targetRepo = TargetRepo;
        seed.local = true;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(r => {
                const result = r as any;
                assert(result.code === 0);
                assert(result.baseDir);
                NodeFsLocalProject.fromExistingDirectory(
                    new GitHubRepoRef("owner", TargetRepo), cwd + "/" + TargetRepo)
                    .then(created => {
                        assert(created.fileExistsSync("pom.xml"));
                        done();
                    });
            }).catch(done);
    }).timeout(10000);
});

export const MockHandlerContext = {
    messageClient: {
        respond(msg: string | SlackMessage) {
            return Promise.resolve();
        },
    },
    graphClient: {
        executeMutationFromFile(file: string, variables?: any): Promise<any> {
            return Promise.resolve({createSlackChannel: [{id: "stts"}]});
        },
    },
};
