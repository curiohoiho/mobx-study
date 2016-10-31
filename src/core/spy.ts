import { globalState } from "./globalstate";
import { objectAssign, deprecated, once, ILambda } from '../utils/utils';


export function isSpyEnabled(): boolean
{
  return !!globalState.spyListeners.length;
} 


/**
 * Given an event object, pass it to all of the
 * spyListeners of the globalState.
 */
export function spyReport(a_event: any): boolean | void 
{
  if (!globalState.spyListeners.length)
    return false;
  
  const lst_listeners = globalState.spyListeners;
  // call each spy listener with the event
  for (let i = 0; i < lst_listeners.length; i++)
  {
    lst_listeners[i](a_event);
  }

} // spyReport()


export function spyReportStart(a_event): void
{
  // take an empty object in the first arg, and add to it all the 
  // properties and values of the other 2 objects.  
  const change = objectAssign({ }, a_event, { spyReportStart: true });
  spyReport(change);

} // spyReportStart()


const END_EVENT = { spyReportEnd: true };


// TODO: change signature to spyReportEnd(time?: number)
export function spyReportEnd(a_change?: Object): void
{
  if (a_change)
  {
    spyReport(objectAssign({ }, a_change, END_EVENT));
  }
  else
  {
    spyReport(END_EVENT);
  }

} // spyReportEnd()

/**
 * returns a function that when run,
 * removes that function from the list of spyListeners.
 */
export function spy(a_fn_listener: (change: any) => void): ILambda
{
  // once ensures the passed in function is invoked only one time. 
  // once returns the function with an "invoked" boolean added to it as a closure.
  // When this function is run, it removes itself from the spyListeners.
  return once( () => {
    const idx = globalState.spyListeners.indexOf(a_fn_listener);
    if (idx !== -1)
      globalState.spyListeners.splice(idx, 1);
  }); // return 

} // spy()


export function trackTransitions(onReport?: (c: any) => void): Lambda {
	deprecated("trackTransitions is deprecated. Use mobx.spy instead");
	if (typeof onReport === "boolean") {
		deprecated("trackTransitions only takes a single callback function. If you are using the mobx-react-devtools, please update them first");
		onReport = arguments[1];
	}
	if (!onReport) {
		deprecated("trackTransitions without callback has been deprecated and is a no-op now. If you are using the mobx-react-devtools, please update them first");
		return () => {};
	}
	return spy(onReport);
}