import {
  IDerivation,
  IDerivationState,
  trackDerivedFunction,
  clearObserving,
  shouldCompute,
  isCaughtException } from './derivation';
import {
  IObservable, 
  startBatch,
  endBatch
 } from './observable';
import { globalState } from './globalstate';
import { 
  createInstanceofPredicate,
  getNextId,
  invariant,
  unique,
  joinStrings
 } from '../utils/utils';
import {
  isSpyEnabled,
  spyReport, 
  spyReportStart,
  spyReportEnd
 } from './spy';
import { getMessage } from '../utils/messages';


/**
 * Reactions are a special kind of derivations. 
 * Several things distinguishes them from normal reactive computations:
 *
 * 1) They will always run, whether they are used by other computations or not.
 *    This means that they are very suitable for triggering side effects like logging, 
 *    updating the DOM and making network requests.
 * 2) They are not observable themselves
 * 3) They will always run after any 'normal' derivations
 * 4) They are allowed to change the state and thereby trigger themselves again, 
 *    as long as they make sure the state propagates to a stable state in a 
 *    reasonable amount of iterations.
 *
 * The state machine of a Reaction is as follows:
 *
 * 1) after creating, the reaction should be started by calling `runReaction` 
 *    or by scheduling it (see also `autorun`)
 * 2) the `onInvalidate` handler should somehow result in a call to `this.track(someFunction)`
 * 3) all observables accessed in `someFunction` will be observed by this reaction.
 * 4) as soon as some of the dependencies has changed the Reaction will be rescheduled 
 *    for another run (after the current mutation or transaction). 
 *    `isScheduled` will yield true once a dependency is stale and during this period
 * 5) `onInvalidate` will be called, and we are back at step 1.
 * 
 *  http://mobxjs.github.io/mobx/refguide/reaction.html
 * 
 *  A variation on autorun that gives more fine grained control on which observables
 *  will be tracked. It takes two functions, the first one (the data function) is tracked 
 *  and returns data that is used as input for the second one, the effect function. 
 *  Unlike autorun the side effect won't be run directly when created, but only 
 *  after the data expression returns a new value for the first time. 
 *  Any observables that are accessed while executing the side effect will not be tracked.
 *
 *  It is important to notice that the side effect will only react to data that was 
 *  accessed in the data expression, which might be less then the data that is actually 
 *  used in the effect. Also, the side effect will only be triggered when the data 
 *  returned by the expression has changed. In other words: reaction requires you 
 *  to produce the things you need in your side effect.
 */






