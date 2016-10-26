import { globalState } from '../core/globalstate';
import { isObservableArray } from '../types/observableArray';


export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);


export interface ILambda 
{
  () : void;
  name? : string;
}


export function getNextId()
{
  return ++globalState.mobxGuid;

} // getNextId()


export function invariant(check: boolean, message: string, thing? : any) : void
{
  if (!check)
  {
    throw new Error("[mobx] Invariant failed: " + message + (thing ? ` in '${thing}'` :  ""));
  }

} // invariant()


const deprecatedMessages = [];
export function deprecated(msg: string) : void 
{
  // if the msg already exists in the array
  if (deprecatedMessages.indexOf(msg) !== -1)
  {
    return;
  }

  deprecatedMessages.push(msg);
  console.error("[mobx] Deprecated: " + msg);

} // deprecated()


/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda
{
  let invoked = false;

  return function() {
    if (invoked) 
      return;
    invoked = true;
    return func.apply(this, arguments);
  }; // return 

} // once()


export const noop = () => {};


export function unique<T>(list: T[]): T[]
{
  const res: T[] = [];

  // see if the item in the list is already in res - if not, push it on 
  list.forEach( item => {
    if (res.indexOf(item) === -1)
      res.push(item);
  }); // forEach

  return res;

} // unique()


export function joinStrings(
  things: string[],
  limit: number = 100,
  separator = " - "
  ) : string
{
  if (!things)
    return "";
  
  const ay_sliced = things.slice(0, limit);
  
  return `${ay_sliced.join(separator)}${things.length > limit ? " (... and " + (things.length - limit) + " more)" : ""}`; 

} // joinStrings()


export function isObject(value: any): boolean
{
  return value !== null && typeof value === "object";
}


export function isPlainObject(value): boolean
{
  if (value === null || typeof value !== "object")
    return false;

  const proto = Object.getPrototypeOf(value);

  // check if there is a prototype chain for this "value" of type object;
  // or if it's a plain, flat object.
  return proto === Object.prototype || proto === null;

} // isPlainObject()


/** 
 * for each object passed in, add their key-values onto a result object 
 */
export function objectAssign(...objs: Object[]): Object;
export function objectAssign() 
{
  const res = arguments[0]; // does this set res to the first object in the argument list?

  for (let i = 1, l = arguments.length; i < l; i++)
  {
    // grab the object passed in as an argument 
    const source = arguments[i];
    // if the key is not on the prototype of the Object
    for (let key in source) if (hasOwnProperty(source, key))
    {
      res[key] = source[key]; // put the value on the result object, could be from multiple objects
    } // inner for 

  } // outer for 

  return res;

} // objectAssign()


export function valueDidChange(
  compareStructural: boolean,
  oldValue: any,
  newValue: any 
  ): boolean
{
  return compareStructural
    ? !deepEquals(oldValue, newValue)
    : oldValue !== newValue;

} // valueDidChange()


const prototypeHasOwnPropery = Object.prototype.hasOwnProperty;
/** if the propName is directly on the object, not on the prototype chain. */
export function hasOwnProperty(
  object: Object, 
  propName: string): boolean
{
  return prototypeHasOwnPropery.call(object, propName);
}


/** add props to an object that will be hidden. */
export function makeNonEnumerable(
  object: any,
  propNames: string[])
{
  for (let i = 0; i < propNames.length; i++)
  {
    addHiddenProp(object, propNames[i], object[propNames[i]]);
  } 

} // makeNonEnumerable()


/** 
 * Add a hidden prop to an object, assigning a value to it
 * by using its .defineProperty() method, and setting "enumerable" to false.  
 * Appears to be mutating the "object" argument.
 */
export function addHiddenProp(
  object: any,
  propName: string,
  value: any): void
{
  // 3rd arg to .defineProperty is a PropertyDescriptor
  Object.defineProperty
  (
    object,
    propName,
    {
      enumerable: false,
      writable: true,
      configurable: true,
      value
    }
  );

} // addHiddenProp()


/** 
 * Add a hidden prop to an object which is not writable, 
 * while assigning a value to it by using its .defineProperty() method.  
 * Appears to be mutating the "object" argument.
 */
export function addHiddenFinalProp(
  object: any,
  propName: string,
  value: any): void 
{
  Object.defineProperty
  (
    object,
    propName,
    {
      enumerable: false,
      writable: false,
      configurable: true,
      value 
    }
  );

} // addHiddenFinalProp()


/**
 * Check an object's PropertyDescriptor to see if 
 * configurable !== false and writable !== false.
 * No mutations of the "object" argument.
 */
export function isPropertyConfigurable(
  object: any,
  prop: string): boolean
{
  const descriptor = Object.getOwnPropertyDescriptor(object, prop);
  
  return !descriptor ||
    (descriptor.configurable !== false && descriptor.writable !== false);

} // isPropertyConfigurable()


/**
 * Is this property on the object both configurable and writable?
 * If not, then we can't make the property observable.
 */
export function assertPropertyConfigurable(
  object: any,
  prop: string): void 
{
  invariant(
    isPropertyConfigurable(object, prop),
    `Cannot make property '${prop}' observable, it is not configurable and writable in the target object.`
  );

} // assertPropertyConfigurable()


/**
 * Takes each property of the object and pushes that property name
 * onto an array, which is pased back out of the function.
 */
export function getEnumerableKeys(obj: Object): string[]
{
  const res: string[] = [];

  // take each key's name on the object and push it onto the array
  for (let key in obj)
    res.push(key);
  
  return res;

} // getEnumerableKeys()


/**
 * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
 * If you have such a case, you probably shouldn't use this function but something fancier :).
 */
export function deepEquals(
  a: any,
  b: any): boolean
{
  if (a === null && b === null)
  {
    return true;
  }

  if (a === undefined && b === undefined)
  {
    return true;
  }

  const aIsArray: boolean = Array.isArray(a) || isObservableArray(a);

  if (aIsArray !== (Array.isArray(b) || isObservableArray(b)))
  {
    return false;
  }
  else if (aIsArray) 
  {
    if (a.length !== b.length)
      return false;
    for (let i = a.length - 1; i >= 0; i--)
    {
      if (!deepEquals(a[i], b[i]))
        return false;
    } // inner for
    return true;
  }
  else if (typeof a === "object" && typeof b === "object")
  {
    if (a === null || b === null)
      return false;
    if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length)
      return false;
    for (let prop in a)
    {
      if (!(prop in b))
        return false;
      if (!deepEquals(a[prop], b[prop]))
        return false;
    } // for
    return true; 
  } // if..else 

  return a === b;

} // deepEquals()



export function createInstanceofPredicate<T>(
  name: string,
  clazz: new (...args: any[]) => T): (x: any) => x is T 
{
  // TODO: this is quite a slow aproach, find something faster? -- mw comment
  const propName = "isMobx" + name;
  clazz.prototype[propName] = true; // add this boolean property to the prototype

  return function(x) {
    return isObject(x) && x[propName] === true;
  } as any;

} // createInstanceofPredicate()