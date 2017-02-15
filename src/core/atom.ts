import { globalState } from './globalstate';
import { 
  IObservable,
  propagateChanged,
  reportObserved,
  startBatch,
  endBatch } from './observable';
import { IDerivationState } from './derivation';
import { createInstanceofPredicate, noop, getNextId } from '../utils/utils';


export interface IAtom extends IObservable
{
  /**
   * Anything that can be used to _store_ state is an Atom in mobx.  
   * Atoms have two important jobs:
   * 
   * 1. detect when they are being _used_ and report this (using reportObserved).  
   *    This allows mobx to make the connection between running functions and
   *    the data they used.
   * 
   * 2. they should notify mobx whenever they have _changed_.  This way mobx can
   *    re-run any functions (derivations) that are using this atom.
   * 
   */

} // IAtom

export class BaseAtom implements IAtom {

  // for effective unobserving.  BaseAtom has true, 
  // for extra opimization, so its onBecomeUnobserved never gets called, 
  // because it's not needed
  isPendingUnobservation = true;
  observers = [];
  observersIndexes = {};

  diffValue = 0;
  lastAccessedBy = 0;
  lowestObserverState = IDerivationState.NOT_TRACKING;

  /**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */
  


} // class BaseAtom


export const isAtom = createInstanceofPredicate("Atom", BaseAtom);