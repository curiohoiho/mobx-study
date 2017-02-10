import { IObservable } from './observable';
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