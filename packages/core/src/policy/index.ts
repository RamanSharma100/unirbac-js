import { Subject } from '../types/subject';

export type AuthorizationContext = Record<string, unknown>;

export type PolicyFn<Context = AuthorizationContext> = (args: {
  subject: Subject;
  context: Context;
}) => boolean | Promise<boolean>;
