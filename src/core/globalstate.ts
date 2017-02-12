import { getGlobal } from '../utils/utils';
import { IDerivation, CaughtException } from './derivation';
import { Reaction } from './reaction';
import { IObservable } from './observable';


// declare const global: any;


/**
 * These values will persist if global state is reset
 */
const ay_s_persistentKeys = ["mobxGuid", "resetId", "spyListeners", "strictMode", "runId"];


export class MobxGlobals
{
  /**
   * MobxGlobals version.
   * Mobx compatibility with other versions loaded in memory as long as this version matches.
   * It indicates that the global state still stores similar information.
   */
  version = 5;

  /**
   * Currently running derivation
   */
  trackingDerivation: IDerivation | null = null;

  /**
   * Are we running a computation currently? (not a reaction)
   */
  computationDepth = 0;

  /**
   * Each time a derivation is tracked, it is assigned a unique run-id 
   */
  runId = 0;

  /**
   * 'guid' for general purpose.  Will be persisted amongst resets.
   */
  mobxGuid = 0;

  /**
   * Are we in a transaction block? (and how many of them)
   */
  // inTransaction = 0;

  /**
   * Are we in a batch block? (and how many of them?)
   */
  inBatch: number = 0;

  /**
   * Observables that don't have observers anymore, and are about to be
   * suspended, unless somebody else accesses it in the same batch 
   * 
   * @type {IObservable[]}
   */
  pendingUnObserservations: IObservable[] = [];

  /**
   * List of scheduled, not yet executed, reactions 
   */
  pendingReactions: Reaction[] = [];

  /**
   * Are we currently running reactions?
   * Reactions are run after derivations using a trampoline.
   */
  isRunningReactions = false;

  /**
   * Is it allowed to change observables at this point?
   * In general, mobx doesn't allow that when running computations and React.render.
   * To ensure that those functions stay pure.
   */
  allowStateChanges = true;

  /**
   * If strict mode is enabled, state changes are by default not allowed.
   */
  strictMode = false;

  /**
   * Used by createTransformer, to detect that the global state has been reset 
   */
  resetId = 0;

  /**
   * Spy callbacks,
   * Holds an array of objects made up of one function.
   * Each spy listener has a function that accepts a change object.
   */
  spyListeners: { (change: any): void }[] = [];

  /**
   * Globally attached error handlers that react specifically to errors in reactions 
   */
  globalReactionErrorHandlers: ( (error: any, derivation: IDerivation) => void )[] = [];

} // class MobxGlobals


/**
 * Get the globalState object 
 */
export let globalState: MobxGlobals = new MobxGlobals();

export function shareGlobalState()
{
  const global = getGlobal();
  const ownState = globalState;

  /**
   * Backward compatibility check
   */
  if (global.__mobservableTrackingStack || global.__mobservableViewStack)
    throw new Error("[mobx] An incompatible version of mobservable is already loaded.");
  
  if (global.__mobxGlobal && global.__mobxGlobal.version !== ownState.version)
    throw new Error("[mobx] An incompatible version of mobx is already loaded.");
  
  if (global.__mobxGlobal)
    globalState = global.__mobxGlobal;
  else
    global.__mobxGlobal = ownState;

} // shareGlobalState()


export function registerGlobals()
{
  // no-op to make explicit why this file is loaded
}


/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to ** get back at a stable state after throwing errors **.
 */
export function resetGlobalState()
{
  globalState.resetId++;
  const defaultGlobals = new MobxGlobals();

  for (let key in defaultGlobals)
  {
    // if this property in defaultGlobals does not exist in ay_s_persistentKeys,
    // add this key to the globalState, with a default value.
    if (ay_s_persistentKeys.indexOf(key) === -1)
      globalState[key] = defaultGlobals[key];
  } // for 

  globalState.allowStateChanges = !globalState.strictMode;

} // resetGlobalState()

