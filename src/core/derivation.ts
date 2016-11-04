import { IDepTreeNode, IObservable, addObserver, removeObserver, endBatch } from './observable';
import { globalState, resetGlobalState } from './globalstate';
import { invariant } from '../utils/utils';
import { isSpyEnabled, spyReport } from './spy';
import { isComputedValue } from './computedvalue';


export enum IDerivationState
{
  // before being run or (outside batch and not being observed)
  // at this point, derivation is not holding any data about dependency tree
  NOT_TRACKING = -1,

  // no shallow dependency changed since last computation
  // won't recalculate derivation
  // this is what makes mobx fast
  UP_TO_DATE = 0,

  // some deep dependency changed, but don't know if shallow dependency changed
  // will require to check first if UP_TO_DATE or POSSIBLY_STALE
  // currently only ComputedValue will propagate POSSIBLY_STALE
  //
  // having this state is second big optimization:
  // don't have to recompute on every dependency change, but only when it's needed
  POSSIBLY_STALE = 1,

  // shallow dependency changed
  // will need to recompute when it's needed
  STALE = 2

} // enum IDerivationState


/**
 * A derivation is everything that can be derived from the state (all the atoms) in a pure manner.
 * See https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 * TODO: the one above is outdated, new one?
 */
export interface IDerivation extends IDepTreeNode
{
  observing: IObservable[];

  newObserving: IObservable[];

  dependenciesState: IDerivationState;

  /**
   * Id of the current run of a derivation.  Each time the derivation is tracked
   * this number is increased by one.  This number is globally unique.
   */
  runId: number; // derivationRunId: number  

  /**
   * amount of dependencies used by the derivation in this run,
   * which has not been bound yet
   */
  unboundDepsCount: number;

  __mapid: string;

  onBecomeStale();

  recoverFromError();  // TODO: revisit implementation of error handling

} // IDerivation

