import { IDerivation } from './derivation';
import { IObservable } from './observable';
import { Reaction } from './reaction';


declare const global: any;


/**
 * These values will persist if global state is reset
 */
const persistentKeys = ["mobxGuid", "resetId", "spyListeners", "strictMode", "runId"];


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

export let globalState: MobxGlobals = new MobxGlobals();

