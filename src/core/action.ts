import { IDerivation, untrackedStart, untrackedEnd } from '../core/derivation';
import { invariant } from '../utils/utils';
import { startBatch, endBatch } from '../core/observable';
import { isSpyEnabled, spyReportStart, spyReportEnd } from '../core/spy';
import { globalState } from '../core/globalstate';
import { getMessage } from '../utils/messages';

export interface IAction
{
  originalFn: Function,
  isMobxAction: boolean 
}


export function createAction (
  a_s_actionName: string,
  a_fn: Function) : Function & IAction 
{
  invariant(typeof a_fn === "function", getMessage("m026"));
	invariant(typeof a_s_actionName === "string" && a_s_actionName.length > 0, `actions should have valid names, got: '${a_s_actionName}'`);

  const res = function()
  {
    return executeAction(a_s_actionName, a_fn, this, arguments);
  };
  (res as any).originalFn = a_fn;
  (res as any).isMobxAction = true;
  return res as any;

} // createAction()


export function executeAction(
  a_s_actionName: string,
  a_fn: Function,
  scope?: any,
  args?: IArguments)
{
  const runInfo = startAction(a_s_actionName, a_fn, scope, args)

  try 
  {
    return a_fn.apply(scope, args);
  }
  finally
  {
    endAction(runInfo);
  }

} // executeAction()


interface IActionRunInfo
{
  prevDerivation: IDerivation | null;
  prevAllowStateChanges: boolean;
  notifySpy: boolean;
  startTime: number;
}

