import {
    HandleCommand,
    SelfDescribingHandleCommand,
} from "./HandleCommand";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { metadataFromInstance } from "./internal/metadata/metadataReading";
import {
    generateHash,
    toStringArray,
} from "./internal/util/string";
import {
    CommandHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
    SecretDeclaration,
    Tag,
    ValueDeclaration,
} from "./metadata/automationMetadata";
import { registerCommand } from "./scan";
import {
    Maker,
    toFactory,
} from "./util/constructionUtils";

export enum QuestionStyle {
    Dialog = "dialog",
    Threaded = "threaded",
    Unthreaded = "unthreaded",
    DialogAction = "dialog_action",
}

/**
 * Handle the given command. Parameters will have been set on a fresh
 * parameters instance before invocation
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained,
 * messages can be sent etc.
 * @return a Promise of a HandlerResult, containing a status code, or anything else representing
 * success.
 */
export type OnCommand<P = undefined> =
    (ctx: HandlerContext, parameters: P) => Promise<HandlerResult> | Promise<any>;

/**
 * Create a HandleCommand instance with the appropriate metadata wrapping
 * the given function
 */
export function commandHandlerFrom<P>(h: OnCommand<P>,
                                      factory: Maker<P>,
                                      name: string = h.name || `Command${generateHash(h.toString())}`,
                                      description: string = name,
                                      intent: string | string[] = [],
                                      tags: string | string[] = [],
                                      autoSubmit: boolean = false,
                                      question?: QuestionStyle): HandleCommand<P> & CommandHandlerMetadata {
    const handler = new FunctionWrappingCommandHandler(name, description, h, factory, tags, intent, autoSubmit, question);
    registerCommand(handler);
    return handler;
}

class FunctionWrappingCommandHandler<P> implements SelfDescribingHandleCommand<P> {

    public parameters: Parameter[];

    // tslint:disable-next-line:variable-name
    public mapped_parameters: MappedParameterDeclaration[];

    public secrets?: SecretDeclaration[];
    public values?: ValueDeclaration[];
    public intent?: string[];
    public tags?: Tag[];
    // tslint:disable-next-line:variable-name
    public auto_submit: boolean;
    public question: "dialog" | "threaded" | "unthreaded" | "dialog_action";

    constructor(public name: string,
                public description: string,
                private readonly h: OnCommand<P>,
                private readonly parametersFactory: Maker<P>,
                // tslint:disable-next-line:variable-name
                private readonly _tags: string | string[] = [],
                // tslint:disable-next-line:variable-name
                private readonly _intent: string | string[] = [],
                private readonly autoSubmit: boolean = false,
                // tslint:disable-next-line:variable-name
                public _question?: QuestionStyle) {
        const newParamInstance = this.freshParametersInstance();
        const md = metadataFromInstance(newParamInstance) as CommandHandlerMetadata;
        this.parameters = md.parameters;
        this.mapped_parameters = md.mapped_parameters;
        this.values = md.values;
        this.secrets = md.secrets;
        this.intent = toStringArray(_intent);
        this.tags = toStringArray(_tags).map(t => ({ name: t, description: t }));
        this.auto_submit = autoSubmit;
        this.question = (!!_question ? _question.toString() : undefined) as any;
    }

    public freshParametersInstance(): P {
        return toFactory(this.parametersFactory)();
    }

    public handle(ctx: HandlerContext, params: P) {
        return this.h(ctx, params);
    }
}
