import { IDerivationState, IDerivation } from './derivation';
import { globalState } from './globalstate';
import { invariant } from '../utils/utils';


// this node is dependent on another node - it's observing other nodes
export interface IDepTreeNode 
{
  name: string;
  observing?: IObservable[];

} // IDepTreeNode


export interface IObservable extends IDepTreeNode // could itself be observing other observables
{
  diffValue: number;

  /**
   * Id of the derivation *run* that last accessed this observable.
   * If this id equals the *run* id of the current derivation,
   * the dependency is already established.
   */  
  lastAccessedBy: number;

  // used to avoid redundant propagations
  lowestObserverState: IDerivationState; // not_tracking, stale, possibly stale, ...

  // used to push itself to global.pendingUnobservations at most once per batch
  isPendingUnobservation: boolean;

  // maintain _observers in raw array for way faster iterating in propagation 
  observers: IDerivation[];

  // map derivation__mapid to observers.indexOf(derivation) (see removeObserver) 
  observersIndexes: {};

  onBecomeUnobserved(); // pitcher ignored?  onBecomePitcherIgnored?

} // IObservable


export function hasObservers(a_observable: IObservable): boolean
{
  
} // hasObservers()