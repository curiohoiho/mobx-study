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

  onBecomeUnobserved();

} // IObservable


export function hasObservers(a_observable: IObservable): boolean
{
  return a_observable.observers && a_observable.observers.length > 0;
} // hasObservers()


export function getObservers(a_observable: IObservable) : IDerivation[]
{
  return a_observable.observers;

} // getObservers()

/**
 * (a) gets the (1) observers held by the observable, and the (2) indexes of those observers,
 * and then (3) for each of these indexes, checks that [??] it does not map the
 * derivation__mapid to the index in the list. 
 */
function invariantObservers(a_observable: IObservable) : void
{
  const lst_observers = a_observable.observers;
  const obj_map_indexes: {} = a_observable.observersIndexes; 
  const n_observers_length = lst_observers.length;

  // loop through the observers, and check the __mapid
  for (let i = 0; i < n_observers_length; i++)
  {
    // @todo: what exactly is the __mapid?  
    // maps derivation__mapid to observers.indexOf(derivation) (see removeObserver)
    const map_id = lst_observers[i].__mapid; 
    if (i)
    {
      // for performance
      invariant(obj_map_indexes[i] === i, "INTERNAL ERROR maps derivation.__mapid to index in list"); 
    }
    else // i === 0 [??]
    {
      // for performance 
      invariant(!(map_id in obj_map_indexes), "INTERNAL ERROR observer on index 0 shouldnt be held in map.");
    } // if..else
  } // for 

  invariant(lst_observers.length === 0 || Object.keys(obj_map_indexes).length === lst_observers.length - 1,
            "INTERNAL ERROR there is no junk in map");

} // invariantObservers()


export function addObserver(a_observable: IObservable, a_node: IDerivation)
{
  const n_number_of_observers: number = a_observable.observers.length;
  
  // because object assignment is relatively expensive, let's not store data about index 0.
  if (n_number_of_observers) 
  {
    // observersIndexes is an object, and we get the value of a_node's [__mapid] property, and
    // use the value as a new property on observersIndexes.  Remember, [__mapid] is a string,
    // so we're accessing observersIndexes{} using the value found in a_node[__mapid] 
    a_observable.observersIndexes[a_node.__mapid] = n_number_of_observers;
  }

  a_observable.observers[n_number_of_observers] = a_node;

  if (a_observable.lowestObserverState > a_node.dependenciesState)
  {
    a_observable.lowestObserverState = a_node.dependenciesState;
  }  

} // addObserver()