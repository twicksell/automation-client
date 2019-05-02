import { TransformableInfo } from "logform";
import * as assert from "power-assert";
import { DEFAULT_REDACTION_PATTERNS } from "../../lib/configuration";
import {
    addRedaction,
    redactLog,
} from "../../lib/util/redact";
// tslint:disable-next-line:no-var-requires
require("../../lib/operations/common/AbstractRemoteRepoRef.ts");

describe("util/redact", () => {

    describe("redaction", () => {

        before(() => {
            DEFAULT_REDACTION_PATTERNS.forEach(d => addRedaction(d.regexp, d.replacement));
        });

        it("redacts things", async () => {
            const replacement = "[DO NOT LOOK]";
            // sorry, but this will replace all booogers for the rest of the tests.
            // That is why I spelled it oddly.
            addRedaction(/booo+gers/, replacement);
            const l: TransformableInfo = {
                level: "info",
                message: "booogers and carrots",
            };
            const result = redactLog(l);
            assert(!result.message.includes("booogers"), "This should have been redacted");
            assert(result.message.includes(replacement), "Don't look at me when I'm picking my nose");
        });

        it("if the regexp has groups, redact those and not the whole thing", async () => {

            addRedaction(/(84 )tomprince( \w+ )t\w+( nal)/, "$1[RIP_TOM]$2[RIP_TOM]$3");
            const l: TransformableInfo = {
                level: "info",
                message: "bujo84 tomprince malakai821 treguy nallaj",
            };
            const result = redactLog(l);
            assert.strictEqual(result.message, "bujo84 [RIP_TOM] malakai821 [RIP_TOM] nallaj",
                "The groups should have been redacted");
        });

        it("prints ordinary stuff", () => {
            const l: TransformableInfo = {
                level: "info",
                message: "boogers and carrots",
            };
            const result = redactLog(l);
            assert.strictEqual(result.message, "boogers and carrots");
        });

        it("removes github token in username position", () => {
            const l: TransformableInfo = {
                level: "warning",
                message: "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@blah blah blah blah",
            };
            const result = redactLog(l);
            assert(!result.message.includes("12093847103847561098457012abfcdefab456ef"), "This should have been redacted");
            assert(result.message.includes("https://[GITHUB_TOKEN]:x-oauth-basic@blah"),
                "Should be obvious about why it is changed");
        });

        it("removes github token without x-oauth-basic", () => {
            const l: TransformableInfo = {
                level: "error",
                message: "https://12093847103847561098457012abfcdefab456ef@blah blah blah blah",
            };
            const result = redactLog(l);
            assert(!result.message.includes("12093847103847561098457012abfcdefab456ef"), "This should have been redacted");
            assert(result.message.includes("https://[GITHUB_TOKEN]@blah"), "bare token not removed");
        });

        it("removes url auth password", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "https://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            };
            const result = redactLog(l);
            assert(!result.message.includes("passwordy"), "This should have been redacted");
            assert(result.message.includes("https://urlencoded%2Fusername:[URL_PASSWORD]@some"), "Be clear about why this is changed");
        });

        it("should not redact non-url auth password", () => {
            const ms = [
                "ahttps://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
                "xtp://urlencoded%2Fusername:something%2Fpasswordy4785748@some.handy.website.com/things",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "debug",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

        // `${this.scheme}gitlab-ci-token:${creds.privateToken}@`
        it("removes gitlab ci token", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "https://gitlab-ci-token:something-tokeny@blah blah blah blah",
            };
            const result = redactLog(l);
            assert(!result.message.includes("something-tokeny"), "This should have been redacted");
            assert(result.message.includes("https://gitlab-ci-token:[URL_PASSWORD]@blah"), "Be clear about why this is changed");
        });

        it("should redact the entire Atomist API key", () => {
            const ms = [
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "Not real 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF\nis not a real API key",
            ];
            const l: TransformableInfo = {
                level: "warning",
                message: "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF is not a real API key",
            };
            const r = redactLog(l);
            const e = {
                level: "warning",
                message: "This [ATOMIST_API_KEY] is not a real API key",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact something longer than an Atomist API key", () => {
            const ms = [
                "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF01 is not a real API key",
                "F0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0 is not a real API key",
                "Not real ABCEDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0 is not a real API key",
                "This 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0\nis not a real API key",
                "This\n0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0\nis not a real API key",
            ];
            ms.forEach(m => {
                const l: TransformableInfo = {
                    level: "warning",
                    message: m,
                };
                const r = redactLog(l);
                assert.deepStrictEqual(r, l);
            });
        });

        it("should redact the entire Twitter access token", () => {
            const l: TransformableInfo = {
                level: "warning",
                message: "This 123456789-0123456789abcdef0123456789abcdef01234567 is not a real access token",
            };
            const r = redactLog(l);
            const e = {
                level: "warning",
                message: "This [TWITTER_ACCESS_TOKEN] is not a real access token",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should redact a free-standing GitHub personal access token", () => {
            const l: TransformableInfo = {
                level: "error",
                message: "\n\n\tThis 0123456789abcdef0123456789abcdef01234567 is not a real personal access token\n",
            };
            const r = redactLog(l);
            const e = {
                level: "error",
                message: "\n\n\tThis [GITHUB_TOKEN] is not a real personal access token\n",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact something longer than a GitHub personal access token", () => {
            const l: TransformableInfo = {
                level: "error",
                message: "\n\n\tThis f0123456789abcdef0123456789abcdef01234567 is not a real personal access token\n",
            };
            const r = redactLog(l);
            assert.deepStrictEqual(r, l);
        });

        it("should redact the entire AWS access key", () => {
            const l: TransformableInfo = {
                level: "debug",
                message: "This\nAKIA0123456789ABCDEF\nis not a real access key",
            };
            const r = redactLog(l);
            const e = {
                level: "debug",
                message: "This\n[AMAZON_ACCESS_KEY]\nis not a real access key",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact something longer than an AWS access key", () => {
            const l: TransformableInfo = {
                level: "warning",
                message: "This\nAKIA0123456789ABCDEF01234\nis not a real access key",
            };
            const r = redactLog(l);
            assert.deepStrictEqual(r, l);
        });

        it("should redact the entire AWS secret key", () => {
            const l: TransformableInfo = {
                level: "warning",
                message: "0123456789ABCDEF+123456789/BCdef0123456= is not a real secret key",
            };
            const r = redactLog(l);
            const e = {
                level: "warning",
                message: "[AMAZON_SECRET_KEY] is not a real secret key",
            };
            assert.deepStrictEqual(r, e);
        });

        it("should not redact something longer than an AWS secret key", () => {
            const l: TransformableInfo = {
                level: "warning",
                message: "0123456789ABCDEF+123456789/BCdef0123456== is not a real secret key",
            };
            const r = redactLog(l);
            assert.deepStrictEqual(r, l);
        });

        it("should redact a lot", () => {
            const l: TransformableInfo = {
                level: "error",
                message: `0123456789ABCDEF+123456789/BCdef0123456= is not a real AWS secret key
Also, 0123456789abcdef0123456789abcdef01234567 is not a real GitHub personal access token
Similarly, this may look like a Google OAuth ID but it is not 123456789-0123456789ABCDEFabcdef01234567Aa.apps.googleusercontent.com
https://user:p%40$$w04D@en.wikipedia.org/ blah blah blah blah "https://12093847103847561098457012abfcdefab456ef:x-oauth-basic@github.com/goo/nar"
Not Atomist API key ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789.
Do not redact 0123456789ABCDEF+123456789/BCdef0123456=+
But do 0123456789ABCDEF+123456789/BCdef0123456=?
`,
            };
            const r = redactLog(l);
            const e = {
                level: "error",
                message: `[AMAZON_SECRET_KEY] is not a real AWS secret key
Also, [GITHUB_TOKEN] is not a real GitHub personal access token
Similarly, this may look like a Google OAuth ID but it is not [GOOGLE_OAUTH_ID]
https://user:[URL_PASSWORD]@en.wikipedia.org/ blah blah blah blah "https://[GITHUB_TOKEN]:x-oauth-basic@github.com/goo/nar"
Not Atomist API key [ATOMIST_API_KEY].
Do not redact 0123456789ABCDEF+123456789/BCdef0123456=+
But do [AMAZON_SECRET_KEY]?
`,
            };
            assert.deepStrictEqual(r, e);
        });

    });

});
