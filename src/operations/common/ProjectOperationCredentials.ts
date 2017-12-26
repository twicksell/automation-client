/**
 * Tag interface for credentials for working with projects
 */
export interface ProjectOperationCredentials {

}

export interface TokenCredentials extends ProjectOperationCredentials {

    token: string;
}

export function isTokenCredentials(poc: ProjectOperationCredentials): poc is TokenCredentials {
    const q = poc as TokenCredentials;
    return q.token !== undefined;
}
