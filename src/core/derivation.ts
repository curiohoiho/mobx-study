import { 
  IObservable, 
  IDepTreeNode, 
  addObserver, 
  removeObserver } from './observable';
import { IAtom } from './atom';
import { globalState } from './globalstate';
import { fail } from '../utils/utils';
import { isComputedValue } from './computedvalue';
import { getMessage } from '../utils/messages';



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
 * That is because we assume that if the first x dependencies of the derivation
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
      const lst_observables: IObservable[] = a_derivation.observing;
      const n_num_observables = lst_observables.length;

      for (let i = 0; i < n_num_observables; i++)
      {
        const obj = lst_observables[i]; // grab an observable
        if (isComputedValue(obj))
        {
          try
          {
            obj.get();
          }
          catch (e)
          {
            // not interested in the value or exception at this moment, 
            // but if there is one, notify all
            untrackedEnd(prevUntracked);
            return true;
          }
          // if ComputedValue `obj` actually changed, it will be computed and 
          // propagated to its observers.
          // and `derivation` is an observer of `obj`
          if ( (derivation as any).dependenciesState === IDerivationState.STALE)
          {
            untrackedEnd(prevUntracked);
            return true;
          }
        } // if isComputedValue()

      } // for :: looping through the lst_observables

      changeDependenciesStateTo0(a_derivation);
      untrackedEnd(prevUntracked);
      return false;      
    } // case IDerivationState.POSSIBLY_STALE

  } // switch (a_derivation.dependenciesState)

} // shouldCompute()


export function isComputingDerivation()
{
  // filter out actions inside computations
  return globalState.trackingDerivation !== null;
}

export function checkIfStateModificationsAreAllowed(a_atom: IAtom)
{
  const b_has_observers = a_atom.observers.length > 0;

  // should never be possible to change an observed observable from inside 
  // computed, see #798
  if (globalState.computationDepth > 0 && b_has_observers)
  {
    fail(getMessage("m031") + a_atom.name);
  }

  // should not be possible to change observed state outside strict mode, 
  // except during initialization, see #563
  if (!globalState.allowStateChanges && b_has_observers)
  {
    fail(getMessage(globalState.strictMode ? "m030a" : "m030b") + a_atom.name);
  }

} // checkIfStateModificationsAreAllowed()


/**
 * Executes the provided function `f` and tracks which observables are being accessed.
 * The tracking information is stored on the `derivation` object and 
 * the derivation is registered as an observer of any of the accessed observables.
 */
export function trackDerivedFunction<T>(
  a_derivation: IDerivation, 
  f: () => T,
  a_context: any)
{
  // pre-allocate array allocation + room for variation in deps 
  // array will be trimmed by bindDependencies
  changeDependenciesStateTo0(a_derivation);
  a_derivation.newObserving = new Array(a_derivation.observing.length + 100);
  a_derivation.unboundDepsCount = 0;
  a_derivation.runId = ++globalState.runId;
  const prevTracking = globalState.trackingDerivation;

  let result: any;
  try 
  {
    result = f.call(a_context)
  }
  catch (e)
  {
    result = new CaughtException(e);
  }

  globalState.trackingDerivation = prevTracking;
  bindDependencies(a_derivation);
  return result;

} // trackDerivedFunction()


/**
 * Diffs newObserving with observing.
 * Update observing to be newObserving with unique observables.
 * Notify observers that become observed/unobserved.
 */
function bindDependencies(a_derivation: IDerivation)
{
  const prevObserving = a_derivation.observing;
  const lst_observing = a_derivation.observing = a_derivation.newObserving!;

  // newObserving shouldn't be needed outside tracking 
  a_derivation.newObserving = null;

  /**
   * Go through all new observables and check diffValue:
   * (this list can contain duplicates):
   *    0: first occurrence, change to 1 and keep it 
   *    1: extra occurrence, drop it 
   */
  let n_i0 = 0;
  let n_unbound_deps = a_derivation.unboundDepsCount;

  for (let i = 0; i < n_unbound_deps; i++)
  {
    const dep = lst_observing[i];
    if (dep.diffValue === 0)
    {
      dep.diffValue = 1;
      // [??] why this if check ??
      if (n_i0 !== i) lst_observing[n_i0] = dep;
      n_i0++;
    }

  } // for

  lst_observing.length = n_i0;

  /**
   * Go though all old observables and check diffValue:
   * (it is unique after last bindDependencies)
   *    0: it's not in new observables, unobserve it 
   *    1: it keeps being observed, don't want to notify it. change to 0.
   */
  n_unbound_deps = prevObserving.length;
  while (n_unbound_deps--)
  {
    const dep = prevObserving[n_unbound_deps];
    if (dep.diffValue === 0)
    {
      removeObserver(dep, a_derivation);
    }
    dep.diffValue = 0;
  } // while

  /**
   * Go through all new observables and check diffValue: (now it should be unique)
   *    0: it was set to 0 in last loop. don't need to do anything.
   *    1: it wasn't observed. let's observe it. set back to 0.
   */
  while (n_i0--)
  {
    const dep = lst_observing[n_i0];
    if (dep.diffValue === 1)
    {
      dep.diffValue = 0;
      addObserver(dep, a_derivation);
    } // if

  } // while 

} // bindDependencies()





