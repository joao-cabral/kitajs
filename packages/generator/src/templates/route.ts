import { Parameter, Route, kReplyParam, kRequestParam } from '@kitajs/common';
import { EOL } from 'os';
import { removeExt } from '../util/path';

/** Generates a route file. */
export const route = (r: Route) =>
  /* ts */ `

import type { RouteOptions, FastifyRequest, FastifyReply } from 'fastify';

import * as ${r.controllerName} from '${removeExt(r.controllerPath)}';

${r.imports?.map((r) => `import ${r.name} from '${removeExt(r.path)}'`).join(EOL) || ''}

${
  r.parameters
    .flatMap((p) => p.imports)
    .filter(Boolean)
    .map((r) => `import ${r!.name} from '${removeExt(r!.path)}'`)
    .join(EOL) || ''
}

export const ${r.schema.operationId}: typeof ${r.controllerName}['${r.controllerMethod}'] = ${r.controllerName}.${
    r.controllerMethod
  }.bind(null);

export ${needsAsync(r.parameters)} function ${
    r.schema.operationId
  }Handler(${kRequestParam}: FastifyRequest, ${kReplyParam}: FastifyReply) {
  ${r.parameters.map(paramHelper).filter(Boolean).join(EOL)}

  ${
    r.customReturn ||
    /* ts */ `
    
    return reply.send(${r.controllerName}.${r.controllerMethod}.call(null, ${r.parameters
      .map((p) => p.value)
      .join(', ')}));
    
    `.trim()
  }
}

/** @internal */
export const ${r.schema.operationId}Meta = ${JSON.stringify(r, null, 2)};

/** @internal */
export const ${r.schema.operationId}Options: RouteOptions = ${options(r)};

`.trim();

/** Renders the options for a route and wraps it in the options wrapper if needed. */
const options = (r: Route) => {
  let handler = /* ts */ `

{
  url: '${r.url}',
  method: '${r.method}',
  handler: ${r.schema.operationId}Handler,
  schema: ${JSON.stringify(r.schema)},
}

`.trim();

  if (r.options) {
    handler = r.options.replace('$1', handler);
  }

  return handler;
};

/** Renders all parameter helpers */
const paramHelper = (param: Parameter) =>
  param.helper
    ? /* ts */ `

${param.helper}

// This helper may have already resolved this request
if (${kReplyParam}.sent) {
  return reply;
}

`.trim()
    : undefined;

/** Renders `async` if some parameter helper needs it */
const needsAsync = (parameters: Parameter[]) => (parameters.some((p) => p.helper?.includes('await')) ? 'async ' : '');
