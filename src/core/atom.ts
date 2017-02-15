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
  constructor(public name = "Atom@" + getNextId()) 
  {

  }

  public onBecomeUnobserved()
  {
    // noop 
  }

  /**
	 * Invoke this method to notify mobx that your atom has been used somehow.
	 */
  public reportObserved()
  {
    reportObserved(this);
  }

  /**
	 * Invoke this method _after_ this method has changed to signal mobx 
   * that all its observers should invalidate.
   * [why] in f#/idris, could force via types this rule 
	 */
  public reportChanged() 
  {
    startBatch();
    propagateChanged(this);
    endBatch();
  }

  toString()
  {
    return this.name;
  }

} // class BaseAtom


export class Atom extends BaseAtom implements IAtom 
{

  isPendingUnobservation = false; // for effective unobserving 
  public isBeingTracked = false;

  /**
	 * Create a new atom. For debugging purposes it is recommended to give it a name.
	 * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
	 */

   constructor(
     public name = "Atom@" + getNextId(),
     public onBecomeObservedHandler: () => void = noop,
     public onBecomeUnobservedHandler: () => void = noop)
  {
    super(name);    
  }

  public reportObserved(): boolean
  {
    startBatch();

    super.reportObserved();

    if (!this.isBeingTracked)
    {
      this.isBeingTracked = true;
      this.onBecomeObservedHandler();
    }

    endBatch();

    return !!globalState.trackingDerivation;
    // return doesn't really give usefull info, because it can be as well calling 
    // computed which calls atom (no reactions)
		// also it could not trigger when calculating reaction dependent on Atom 
    // because Atom's value was cached by computed called by given reaction.

  } // reportObserved()

  public onBecomeUnobserved() 
  {
    this.isBeingTracked = false;
    this.onBecomeObservedHandler();
  } // onBecomeUnobserved()

} // class Atom 


export const isAtom = createInstanceofPredicate("Atom", BaseAtom);