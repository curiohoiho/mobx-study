import { IDerivation } from './derivation';
import { IObservable } from './observable';
import { Reaction } from './reaction';


declare const global: any;


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
  version = 4;

  /**
   * Stack of currently running derivations
   */
  trackingDerivation: IDerivation = null;

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
  inTransaction = 0;

  /**
   * Are we currently running reactions?
   * Reactions are run after derivations using a trampoline.
   */
  isRunningReactions = false;

  /**
   * Are we in a batch block? (and how many of them)
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

} // class MobxGlobals


/**
 * Get the globalState object 
 */
export const globalState: MobxGlobals = ( () => {

  const res = new MobxGlobals();

  /**
   * Backward compatibility check
   */
  if (global.__mobservableTrackingStack || global.__mobservableViewStack)
    throw new Error("[mobx] An incompatible version of mobservable is already loaded.");
  
  if (global.__mobxGlobal && global.__mobxGlobal.version !== res.version)
    throw new Error("[mobx] An incompatible version of mobx is already loaded.");
  
  if (global.__mobxGlobal)
    return global.__mobxGlobal;
  
  return global.__mobxGlobal = res;

})(); // globalState -- we call it immediately, right here 


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

