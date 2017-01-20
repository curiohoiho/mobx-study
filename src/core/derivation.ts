import { 
  IObservable, 
  IDepTreeNode, 
  addObserver, 
  removeObserver } from './observable';
import { globalState } from './globalstate';
import { isComputedValue } from './computedvalue';
import { invariant } from '../utils/utils';


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
 */
export interface IDerivation extends IDepTreeNode
{
  observing: IObservable[];

  newObserving: null | IObservable[];

  dependenciesState: IDerivationState;

  /**
   * Id of the current run of a derivation.  Each time the derivation is tracked
   * this number is increased by one.  This number is globally unique.
   */
  runId: number; 

  /**
   * amount of dependencies used by the derivation in this run,
   * which have not been bound yet
   */
  unboundDepsCount: number;

  __mapid: string;

  onBecomeStale();

} // IDerivation


export class CaughtException
{
  constructor(public cause: any)
  {
    // empty
  }

} // class CaughtException


export function isCaughtException(e): e is CaughtException
{
  return e instanceof CaughtException;
}


/**
 * Finds our whether any dependency of derivation actually changed.
 * If dependenciesState is 1 (POSSIBLY_STALE), it will recalculate dependencies.
 * If any dependency changed, it will propagate it by changing 
 * dependenciesState to 2 (STALE).
 * 
 * By iterating over dependencies in the same order that they were reported
 * and stopping on the first change,
 * all recalculations are called only for ComputedValues that will be tracked 
 * anyway by derivation.
 * That is because we assume that if the first x dependencies of derivation
 * do not change, then the derivation should run the same way up until 
 * accessing the x-th dependency. 
 */
export function shouldCompute(a_derivation: IDerivation): boolean 
{
  switch(a_derivation.dependenciesState)
  {
    case IDerivationState.UP_TO_DATE: return false;
    case IDerivationState.NOT_TRACKING:
    case IDerivationState.STALE: return true;

    case IDerivationState.POSSIBLY_STALE:
    {
      // no need for those computeds to be reported, they will be picked up
      // in trackDerivedFunction.
      const prevUntracked = untrackedStart();
      
    } // case IDerivationState.POSSIBLY_STALE

  } // switch (a_derivation.dependenciesState)

} // shouldCompute()

