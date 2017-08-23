import { invariant, addHiddenProp, hasOwnProperty } from './utils';

/**
 * mw comment:
 * Constructs a decorator, that normalizes the differences between
 * TypeScript and Babel. Mainly caused by the fact that legacy-decorator cannot assign
 * values during instance creation to properties that have a getter setter.
 *
 * - Sigh -
 *
 * Also takes care of the difference between @decorator field and @decorator(args) field, 
 * and different forms of values.
 * For performance (cpu and mem) reasons the properties are always defined on the prototype 
 * (at least initially).
 * This means that these properties despite being enumerable might not show up 
 * in Object.keys() (but they will show up in for...in loops).
 */
export function createClassPropertyDecorator(
  /**
	 * This function is invoked once, when the property is added to a new instance.
	 * When this happens is not strictly determined due to differences in TS and Babel:
	 * Typescript: Usually when constructing the new instance
	 * Babel, sometimes Typescript: during the first get / set
	 * Both: when calling `runLazyInitializers(instance)`
	 */
  a_onInitialize: 
    (target: any, property: string, initialValue: any, customArgs?: IArguments, originalDescriptor?: PropertyDescriptor) => void,
  a_get: (name: string) => any,
  a_set: (name: string, newValue: any) => void,
  a_b_enumerable: boolean,
  /**
	 * Can this decorator be invoked with arguments? e.g. @decorator(args)
	 */
  a_b_allowCustomArguments: boolean): any 
{
  // local function that is returned from the outer function  
  function classPropertyDecorator(
    a_target: any, a_s_key: string, a_descriptor: PropertyDescriptor, a_customArgs?: IArguments, a_n_argLen?: number) 
    : PropertyDescriptor
  {
    invariant(
      a_b_allowCustomArguments || quacksLikeADecorator(arguments), // this part must return false to run the error message
      "This function is a decorator, but it wasn't invoked like a decorator"
    );

    if (!a_descriptor)
    {
      // typescript (except for getter / setters)
      const newDescriptor =
      {
        enumerable: a_b_enumerable,
        configurable: true,
        
        get: function() {
          if (!this.__mobxInitializedProps || this.__mobxInitializedProps[a_s_key] !== true)
          {
            typescriptInitializeProperty(this, a_s_key, undefined, a_onInitialize, a_customArgs, a_descriptor);
          }
          return a_get.call(this, a_s_key);
        }, // get

        set: function(v) {
          if (!this.__mobxInitializedProps || this.__mobxInitializedProps[a_s_key] !== true)
          {
            typescriptInitializeProperty(this, a_s_key, v, a_onInitialize, a_customArgs, a_descriptor);
          }
          else
          {
            a_set.call(this, a_s_key, v);
          }
        } // set

      }; // newDescriptor

      if (arguments.length < 3 || arguments.length === 5 && a_n_argLen < 3)
      {
        // Typescript target is ES3, so it won't define property for us
				// or using Reflect.decorate polyfill, which will return no descriptor
				// (see https://github.com/mobxjs/mobx/issues/333)
        Object.defineProperty(a_target, a_s_key, newDescriptor);
      }

      return newDescriptor;
    }
    else 
    {
      // babel and typescript getter / setter props
      if (!hasOwnProperty(a_target, "__mobxLazyInitializers"))
      {
        addHiddenProp(
          a_target, 
          "__mobxLazyInitializers",
          (a_target.__mobxLazyInitializers && a_target.__mobxLazyInitializers.slice()) || [] // support inheritance
        );
      } // inner if 

      const {value, initializer} = a_descriptor; // @todo: error here says "initializer" isn't part of PropertyDescriptor
      a_target.__mobxLazyInitializers.push( instance => {
        a_onInitialize(
          instance,
          a_s_key,
          (initializer ? initializer.call(instance) : value),
          a_customArgs,
          a_descriptor
        );
      });

      return {
        enumerable: a_b_enumerable,
        configurable: true,
        get : function() {
          if (this.__mobxDidRunLazyInitializers !== true)
            runLazyInitializers(this);
          return a_get.call(this, a_s_key);
        }, 
        set: function(v) {
          if (this.__mobxDidRunLazyInitializers !== true)
            runLazyInitializers(this);
          a_set.call(this, a_s_key, v);
        }
      }; // return PropertyDescriptor

    } // if (!a_descriptor) ... else 

  } // local, inner function classPropertyDecorator()


  // leaving local, inner function and returning to the original function
  if (a_b_allowCustomArguments)
  {
    /** If custom arguments are allowed, we should return a function that returns a decorator */
    return function() {
      /** Direct invocation: @decorator bla */
      if (quacksLikeADecorator(arguments))
        return classPropertyDecorator.apply(null, arguments);
      /** Indirect invocation: @decorator(args) bla */
      const outerArgs = arguments;
      const argLen = arguments.length;
      return (target, key, descriptor) => classPropertyDecorator(target, key, descriptor, outerArgs, argLen);
    }; // return 

  } // if (a_b_allowCustomArguments)

  return classPropertyDecorator;

} // createClassPropertyDecorator() - outer function 


function typescriptInitializeProperty(
  a_instance: any,
  a_s_key: string,
  a_v: any,
  a_onInitialize,
  a_customArgs,
  a_baseDescriptor) : void 
{
  if (!hasOwnProperty(a_instance, "__mobxInitializedProps"))
    addHiddenProp(a_instance, "__mobxInitializedProps", {});
  a_instance.__mobxInitializedProps[a_s_key] = true;
  a_onInitialize(a_instance, a_s_key, a_v, a_customArgs, a_baseDescriptor);

} // typescriptInitializeProperty()


export function runLazyInitializers(a_instance: any) : void 
{
  if (a_instance.__mobxDidRunLazyInitializers === true)
    return;
  
  if (a_instance.__mobxLazyInitializers)
  {
    addHiddenProp(a_instance, "__mobxDidRunLazyInitializers", true);
    a_instance.__mobxDidRunLazyInitializers && a_instance.__mobxLazyInitializers.forEach(initializer => initializer(a_instance));
  }

} // runLazyInitializers()


function quacksLikeADecorator(args: IArguments) : boolean
{
  return (args.length === 2 || args.length === 3) &&
    typeof args[1] === "string";
}



