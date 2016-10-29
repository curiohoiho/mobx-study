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


/**
 * must remove from 2 places: the _observersIndexes map and the _observers list.
 * uses a "filler" to remove from the list, and to overwrite the map index.
 */
export function removeObserver(a_observable: IObservable, a_node: IDerivation)
{
  if (a_observable.observers.length === 1)
  {
    // deleting last observer
    a_observable.observers.length = 0;

    queueForUnobservation(a_observable);
  }
  else // more than 1 observable 
  {
    // deleting from _observersIndexes is straight forward; 
    // to delete from _observers, let's swap 'a_node' with last element
    // must delete from 2 places: _observersIndexes and _observers.
    const lst_observers = a_observable.observers;
    const map_observers_indexes = a_observable.observersIndexes;
    
    // get last element, which should fill the place of `node`, so the array doesnt have holes
    const filler = lst_observers.pop();

    // otherwise node was the last element, which already got removed from array
    if (filler !== a_node)
    {
      // getting index of `node`. this is the only place we actually use map.
      const index = map_observers_indexes[a_node.__mapid] || 0;
      // map store all indexes but 0, see comment in `addObserver`
      if (index)
      {
        map_observers_indexes[filler.__mapid] = index;
      }
      else 
      {
        delete map_observers_indexes[a_node.__mapid];
      } // inner, inner if else (index on the map exists)
      
      lst_observers[index] = filler;

    } // inner if (filler !== a_node)

    delete map_observers_indexes[a_node.__mapid];

  } // outer if..else (observable.observers.length === 1)

} // removeObserver()


/**
 * place this observable on the globalstate.pendingUnObservations
 */
export function queueForUnobservation(a_observable: IObservable)
{
  if (!a_observable.isPendingUnobservation)
  {
    a_observable.isPendingUnobservation = true;
    globalState.pendingUnObserservations.push(a_observable);
  }

} // queueForUnobservation()


/**
 * Batch is a pseudo-transaction, just for purpose of memoizing ComputedValues
 * when nothing else does.
 * During a batch, `onBecomeUnobserved` will be called at most once per observable.
 * Avoids unnecessary recalculations. 
 */
export function startBatch()
{
    globalState.inBatch++;
}


/**
 * From the globalstate, get all the pending unobservations.
 * Then set the observable's `isPendingUnobservation` to false,
 * and clear out the globalState's `pendingUnObserservations`.
 */
export function endBatch()
{
  if (globalState.inBatch === 1)
  {
    // the batch is actually about to finish, all unobserving should happen here
    const lst_pending_unobservations = globalState.pendingUnObserservations;

    for (let i = 0; i < lst_pending_unobservations.length; i++)
    {
      const observable = lst_pending_unobservations[i];
      observable.isPendingUnobservation = false;

      if (observable.observers.length === 0)
      {
        observable.onBecomeUnobserved();
        // NOTE: onBecomeUnobserved might push to `pendingObservations`
        // but does the line below clear those out anyway?
      }
    } // for lst_pending_unobservations

    globalState.pendingUnObserservations = [];

  } // if (globalState.inBatch === 1)

  globalState.inBatch--;

} // endBatch()


/**
 * 1. get the current tracking derivation from the globalState.
 * 2. use the derivation's runId to see if this derivation already accessed this observable.
 * 3. If not, add this derivation's runId to the observable's `lastAccessedBy`.
 * 4. Otherwise, `queueForUnobservation`.
 */
export function reportObserved(a_observable: IObservable)
{
  const derivation = globalState.trackingDerivation;

  if (derivation !== null)
  {
    /**
     * Simple optimization, give each derivation a unique id (runId).
     * Check if the last time this observable was accessed, the same runId was used.
     * If this is the case, the relation is already known.
     */
    if (derivation.runId !== a_observable.lastAccessedBy)
    {
      a_observable.lastAccessedBy = derivation.runId;
      // @todo: so what does it mean to be unbound in this derivation's context?
      derivation.newObserving[derivation.unboundDepsCount++] = a_observable;
    } // inner if 
  }
  else if (a_observable.observers.length === 0)
  {
    queueForUnobservation(a_observable);
  } // outer if..else if 

} // reportObserved()


/**
 * This is expensive, so better not to run it in production.
 * But it's temporarily helpful for testing.
 */
function invariantLOS(a_observable: IObservable, msg: string)
{
  

} // invariantLOS()