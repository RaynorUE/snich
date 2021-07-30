declare namespace sn_sc {

	/** 
	 * To use this class in a scoped application, use the sn_sc namespace identifier. The Service Catalog Scoped API plugin (ID: com.glideapp.servicecatalog.scoped.api) that is enabled by default is required to access the CartJS API.
	 * 
	 */
	class CartJS {
	
		/**
		 *
		 * @param {string} cartName Optional. Name of a defined cart for the user who is currently logged in.
		 *
		 */
		constructor(cartName: string)
		
		/**
		 *
		 * Adds the request for a catalog item to the current cart.
		 *
		 * @param {{[fieldName: string]: string}} request A JSON object that contains the details of the catalog item to be added to the cart.
		 * 
		 * The structure of the request object is:
		 * 
		 * {
		 * 'sysparm_id': item_id,
		 * 'sysparm_quantity': item_quantity,
		 * 'variables':{
		 * 'var_name': 'var_value',
		 * ...
		 * }
		 * }
		 * 
		 * *   item_id: sys_id of the item to be added to the cart
		 * *   item_quantity: Number of items to be added. Default value is 1.
		 * *   var_name: Name of the question.
		 * *   var_value: Value of the answer (Not the display value).
		 *
		 * @returns {{[fieldName: string]: string}} Structure of the current cart.
		 * 
		 * {
		 * 'subtotal': value,
		 * 'items':[
		 * {
		 * itemName:'',
		 * quantity:'', 
		 * price:'', 
		 * recurring_price:''
		 * } ...]
		 * }
		 */
		addToCart(request: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Specifies if the current user has the required role to edit the Request for field.
		 *
		 *
		 * @returns {boolean} Flag that indicates whether the user has the required role to edit the requested for field.
		 * 
		 * Valid values:
		 * 
		 * *   true: user has the required role
		 * *   false: user does not have the required role
		 */
		canViewRF(): boolean
		
		/**
		 *
		 * Performs the cart checkout. If the two-step checkout is enabled, returns the order summary. If the two-step checkout is disabled, the cart is submitted and details of the generated request are returned.
		 *
		 *
		 * @returns {{[fieldName: string]: string}} If the two-step checkout is enabled, the summary of the items in the cart is returned.
		 * 
		 * { "subtotal_price":"",
		 *   "subtotal_recurring_frequency":"",
		 *   "delivery_address":"",
		 *   "special_instructions":"",
		 *   "total_title":"",
		 *   "requested_for_user":"System Administrator",
		 *   "requested_for":"6816f79cc0a8016401c5a33be04be441",
		 *   “daily”: ["frequency_subtotal":"", "items":[{}, {}, ...], …],
		 *   “monthly”:["frequency_subtotal":"", "items":[{}, {}, ...], …],
		 *   “annually”:["frequency_subtotal":"", "items":[{}, {}, ...], …],
		 *   "none":["frequency_subtotal":"", "items":[{}, {}, ...], …],
		 * }
		 * 
		 * If the two-step checkout is disabled:
		 * 
		 * {
		 *   'request_id' : "sys_id of the generated request",
		 *   "request_number" : "Number of the generated request"
		 * }
		 */
		checkoutCart(): {[fieldName: string]: string}
		
		/**
		 *
		 * Deletes the current cart.
		 *
		 *
		 * @returns {void} Method does not return a value
		 */
		empty(): void
		
		/**
		 *
		 * Returns the cart details.
		 *
		 *
		 * @returns {{[fieldName: string]: string}} Object pointing to the current cart details.
		 */
		getCartDetails(): {[fieldName: string]: string}
		
		/**
		 *
		 * Returns the cart id of the current cart.
		 *
		 *
		 * @returns {string} sys_id for the current cart.
		 */
		getCartID(): string
		
		/**
		 *
		 * Returns a GlideRecord object containing records for items in the current cart.
		 *
		 *
		 * @returns {GlideRecord} GlideRecord object including records and fields from the Item [sc_cart_item] table that describe an item in the current cart.
		 */
		getCartItems(): GlideRecord
		
		/**
		 *
		 * Gets the delivery address for the current cart.
		 *
		 *
		 * @returns {string} Delivery address for the current cart.
		 */
		getDeliveryAddress(): string
		
		/**
		 *
		 * Gets the sys_id from the sys_user record of the user for whom the cart is requested.
		 *
		 *
		 * @returns {string} sys_id from the sys_user record of the user for whom the cart is requested.
		 */
		getRequestedFor(): string
		
		/**
		 *
		 * Gets the name from the user record of the user for whom the current cart is requested.
		 *
		 *
		 * @returns {string} Name from the user record of the user for whom the current cart is requested.
		 */
		getRequestedForDisplayName(): string
		
		/**
		 *
		 * Gets the special instructions for the current cart.
		 *
		 *
		 * @returns {string} Special instructions for the current cart.
		 */
		getSpecialInstructions(): string
		
		/**
		 *
		 * Orders a single item. If two-step checkout is enabled, the method adds the specified item to the cart and returns the sys_id of the cart. If two-step checkout is disabled, the method completes the purchase of the specified item and returns the sys_id of the generated request.
		 *
		 * @param {{[fieldName: string]: string}} request JSON object that contains details of the catalog item to order.
		 * @param {string} request.delivery_address Address to which to deliver the items.
		 * 
		 * Default: Address of user
		 * @param {string} request.sysparm_id Required. The sys_id of the item to purchase.
		 * @param {string} request.special_instructions Instructions to follow when processing the order.
		 * @param {string} request.sysparm_quantity Quantity of the specified item to purchase.
		 * 
		 * Default: 1
		 * @param {string} request.sysparm_requested_for The sys_id of the user for whom the item is requested.
		 * 
		 * Default: Session user
		 * @param {{[fieldName: string]: string}} request.variables Questions and customer answers associated with the item.
		 * @param {string} request.variables.var_name Name of the question.
		 * @param {string} request.variables.var_value Customer's response to the associated question.
		 *
		 * @returns {{[fieldName: string]: string}} Output if two-step checkout is enabled:
		 * 
		 * {
		 *   'cart_id' : '<sys_id of the cart to which the items were added>'
		 * }
		 * 
		 * Output if two-step checkout is disabled:
		 * 
		 * {
		 *   'request_id' : '<sys_id of the generated request>',
		 *   'request_number' : '<Number of the generated request>'
		 * }
		 */
		orderNow(request: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Sets the delivery address for the current cart.
		 *
		 * @param {string} address Delivery address for the current cart.
		 *
		 * @returns {void} Method does not return a value
		 */
		setDeliveryAddress(address: string): void
		
		/**
		 *
		 * Sets the sys_id in the sys_user record of the user for whom the cart is requested.
		 *
		 * @param {string} user sys_id to be set in the sys_user record of the user for whom the cart is requested.
		 *
		 * @returns {void} Method does not return a value
		 */
		setRequestedFor(user: string): void
		
		/**
		 *
		 * Sets the special instructions for the current cart.
		 *
		 * @param {string} specialInstructions Special instructions for the current cart.
		 *
		 * @returns {void} Method does not return a value
		 */
		setSpecialInstructions(specialInstructions: string): void
		
		/**
		 *
		 * Updates special instructions, requested for, and delivery address from the request parameter and performs the cart checkout. Use this API to modify the mentioned parameters of the cart and perform the cart checkout simultaneously. Missing parameters in the request object will have their default value.
		 *
		 * @param {{[fieldName: string]: string}} request A JSON object that contains details of the cart to be submitted.
		 * 
		 * The structure of the request object is:
		 * 
		 * {
		 *   'special_instructions' : 'instructions',
		 *   'sysparm_requested_for' : requested_for,
		 *   'delivery_address' : 'address'
		 * }
		 * 
		 * *   instructions: Special instructions for the request.
		 * *   requested_for : sys_id of the requested_for user.
		 * *   address: Delivery address for the request.
		 *
		 * @returns {{[fieldName: string]: string}} Structure of the cart.
		 * 
		 * {
		 *   'request_id' : 'sys_id of the generated Request',
		 *   'request_number' : 'Number of the generated Request'
		 * }
		 */
		submitOrder(request: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Updates an item in the cart.
		 *
		 * @param {{[fieldName: string]: string}} request A JSON object that contains details of the catalog item to be updated.
		 * 
		 * The structure of the request object is:
		 * 
		 * {
		 *     'sysparm_quantity' : item_quantity,
		 *   'sysparm_requested_for' : requested_for,
		 *   'variables' : {
		 *     'var_name' : 'var_value',
		 *     ...
		 *   }
		 * }
		 * 
		 * *   item_quantity: Number of items to be added. Default value is 1.
		 * *   var_name: Name of the question.
		 * *   var_value: Value of the answer (Not the display value).
		 * @param {string} cart_item_id sys_id of the cart item to be modified.
		 *
		 * @returns {{[fieldName: string]: string}} Details of the cart.
		 * 
		 * {
		 *   'subtotal': value,
		 *   'items':[
		 *     {
		 *     itemName:'',
		 *     quantity:'',
		 *     price:'',
		 *     recurring_price:''
		 *     }
		 *     ...],
		 *   ...
		 * }
		 */
		updateItem(request: {[fieldName: string]: string}, cart_item_id: string): {[fieldName: string]: string}
		
	}
	
	/** 
	 * To use this class in a scoped application, use the sn_sc namespace identifier. The Service Catalog Scoped API plugin (ID: com.glideapp.servicecatalog.scoped.api) that is enabled by default is required to access the CatalogClientScript API.
	 * 
	 */
	class CatalogClientScript {
	
		/**
		 *
		 *
		 */
		constructor()
		
		/**
		 *
		 * Adds a script to the catalog client script.
		 *
		 * @param {string} script Script to be added to the catalog client script.
		 *
		 * @returns {void} Method does not return a value
		 */
		addScript(script: string): void
		
		/**
		 *
		 * Specifies if the catalog client script runs on a catalog item.
		 *
		 * @param {boolean} flag If true, the catalog client script runs on the catalog item. If false, the catalog client script does not run on the catalog item.
		 *
		 * @returns {void} Method does not return a value
		 */
		appliesToCatalogItem(flag: boolean): void
		
		/**
		 *
		 * Specifies if the catalog client script runs on a catalog task.
		 *
		 * @param {boolean} flag If true, the catalog client script runs on the catalog task. If false, the catalog client script does not run on the catalog task.
		 *
		 * @returns {void} Method does not return a value
		 */
		appliesToCatalogTask(flag: boolean): void
		
		/**
		 *
		 * Specifies if the catalog client script runs on a requested item.
		 *
		 * @param {boolean} flag If true, the catalog client script runs on the requested item. If false, the catalog client script does not run on the requested item.
		 *
		 * @returns {void} Method does not return a value
		 */
		appliesToRequestedItem(flag: boolean): void
		
		/**
		 *
		 * Specifies if the catalog client script runs on a requested item.
		 *
		 * @param {boolean} flag If true, the catalog client script runs on the target record. If false, the catalog client script does not run on the target record.
		 *
		 * @returns {void} Method does not return a value
		 */
		appliesToTargetRecord(flag: boolean): void
		
		/**
		 *
		 * Inserts the defined catalog client script in the catalog_script_client table.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {string} sys_id of the catalog client script.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Deletes the defined catalog client script.
		 *
		 * @param {string} sys_id sys_id of the catalog client script.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(sys_id: string, standardUpdate: boolean): void
		
		/**
		 *
		 * Defines attribute values for the catalog client script.
		 *
		 * @param {{[fieldName: string]: string}} attributes A JSON object that has mapping for the field and value pairs.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Associates a catalog item with the catalog client script.
		 *
		 * @param {string} sys_id sys_id of the catalog item.
		 *
		 * @returns {void} Method does not return a value
		 */
		setCatalogItem(sys_id: string): void
		
		/**
		 *
		 * Runs the catalog client script when a variable value is updated.
		 *
		 * @param {string} sys_id sys_id of the variable.
		 *
		 * @returns {void} Method does not return a value
		 */
		setOnChangeVariable(sys_id: string): void
		
		/**
		 *
		 * Associates a variable set with the catalog client script.
		 *
		 * @param {string} sys_id sys_id of the variable set.
		 *
		 * @returns {void} Method does not return a value
		 */
		setVariableSet(sys_id: string): void
		
	}
	
	/** 
	 */
	class CatalogItemVariable {
	
		/**
		 *
		 * Insert the defined catalog item variable.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {string} Return the sys_id of the inserted variable record.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Delete the defined catalog item variable.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(standardUpdate: boolean): void
		
		/**
		 *
		 * Get a mapping of catalog item variable attribute values.
		 *
		 * @param {{[fieldName: string]: string}} columns Specify the set of columns that you would like the values for.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {{[fieldName: string]: string}} An object mapping column names to values.
		 */
		read(columns: {[fieldName: string]: string}, standardUpdate: boolean): {[fieldName: string]: string}
		
		/**
		 *
		 * Define attribute values for this catalog item variable.
		 *
		 * @param {{[fieldName: string]: string}} attributes An object mapping column names to values.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Use to update current catalog item variable with set values.
		 *
		 * @param {{[fieldName: string]: string}} columnValues An object mapping column names to values.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		update(columnValues: {[fieldName: string]: string}, standardUpdate: boolean): void
		
	}
	
	/** 
	 */
	class CatalogItemVariableSet {
	
		/**
		 *
		 * Inserts the defined catalog item variable set.
		 *
		 * @param {boolean} standardUpdate Flag indicating whether to enable the running of engines and workflow.
		 * 
		 * Valid values:
		 * 
		 * *   true: Enable the running of engines and workflow.
		 * *   false: Do not enable the running of engines and workflow.
		 *
		 * @returns {string} Sys_id of the inserted variable record.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Delete the defined catalog item variable.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(standardUpdate: boolean): void
		
		/**
		 *
		 * Get a mapping of catalog item variable set attribute values.
		 *
		 * @param {{[fieldName: string]: string}} columns Specify the set of columns that you would like the values for.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {{[fieldName: string]: string}} An object mapping column names to values.
		 */
		read(columns: {[fieldName: string]: string}, standardUpdate: boolean): {[fieldName: string]: string}
		
		/**
		 *
		 * Define attribute values for this catalog item variable set.
		 *
		 * @param {{[fieldName: string]: string}} attributes An object mapping column names to values.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Use to update current catalog item variable set with set values.
		 *
		 * @param {{[fieldName: string]: string}} columnValues An object mapping column names to values.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		update(columnValues: {[fieldName: string]: string}, standardUpdate: boolean): void
		
	}
	
	/** 
	 */
	class CatalogItemVariableSetM2M {
	
		/**
		 *
		 * Insert the defined catalog item variable set M2M.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {string} Return the sys_id of the inserted variable record.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Delete the defined catalog item variable set M2M.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(standardUpdate: boolean): void
		
		/**
		 *
		 * Get a mapping of catalog item variable set M2M attribute values.
		 *
		 * @param {{[fieldName: string]: string}} columns Specify the set of columns that you would like the values for.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {{[fieldName: string]: string}} An object mapping column names to values.
		 */
		read(columns: {[fieldName: string]: string}, standardUpdate: boolean): {[fieldName: string]: string}
		
		/**
		 *
		 * Define attribute values for this catalog item variable set M2M.
		 *
		 * @param {{[fieldName: string]: string}} attributes An object mapping column names to values.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Updates current catalog item variable set M2M with set values.
		 *
		 * Consistency across all API ref topics is critical. Follow the template exactly or the importer script will fail.
		 *
		 * @param {{[fieldName: string]: string}} columnValues An object mapping column names to values.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		update(columnValues: {[fieldName: string]: string}, standardUpdate: boolean): void
		
	}
	
	/** 
	 * To use this class in a scoped application, use the sn_sc namespace identifier. The Service Catalog Scoped API plugin (com.glideapp.servicecatalog.scoped.api) that is enabled by default is required to access the CatalogJS API.
	 * 
	 */
	class CatalogJS {
	
		/**
		 *
		 * @param {string} sys_id sys_id of the Catalog.
		 *
		 */
		constructor(sys_id: string)
		
		/**
		 *
		 * Specifies if the catalog is viewable for the user.
		 *
		 * @param {boolean} mobile True if the view is mobile view. Else, false.
		 *
		 * @returns {boolean} Returns true if the catalog is viewable for the user.
		 */
		canView(mobile: boolean): boolean
		
		/**
		 *
		 * If only one active catalog exists, that catalog is returned. Else, the earliest catalog created is returned, from the list of the catalogs that the user can view. If no catalog is available, null is returned.
		 *
		 *
		 * @returns {{[fieldName: string]: string}} Object pointing to the earliest catalog that the user can view.
		 */
		getAvailableCatalog(): {[fieldName: string]: string}
		
		/**
		 *
		 * Returns the catalog background color.
		 *
		 *
		 * @returns {string} Background color of the catalog.
		 */
		getBackgroundColor(): string
		
		/**
		 *
		 * Specifies the number of catalogs active in the catalog table.
		 *
		 *
		 * @returns {number} Number of catalogs available in the catalog table.
		 */
		getCatalogCount(): number
		
		/**
		 *
		 * Returns the categories for the specified catalog.
		 *
		 *
		 * @returns {any[]} Returns the categories for the specified catalog.
		 */
		getCategories(): any[]
		
		/**
		 *
		 * Specifies the sys_ids of the categories in the specified catalog.
		 *
		 *
		 * @returns {any[]} Returns the sys_ids of the categories in the specified catalog.
		 */
		getCategoryIds(): any[]
		
		/**
		 *
		 * Specifies the catalog description.
		 *
		 *
		 * @returns {string} Catalog description.
		 */
		getDescription(): string
		
		/**
		 *
		 * Returns the catalog desktop image value.
		 *
		 *
		 * @returns {string} Catalog desktop image value.
		 */
		getDesktopImageSRC(): string
		
		/**
		 *
		 * Returns the catalog gliderecord.
		 *
		 *
		 * @returns {GlideRecord} GlideRecord of the catalog.
		 */
		getGr(): GlideRecord
		
		/**
		 *
		 * Returns the catalog header icon.
		 *
		 *
		 * @returns {string} Catalog header icon.
		 */
		getHeaderIconSRC(): string
		
		/**
		 *
		 * Specifies the sys_id of the catalog.
		 *
		 *
		 * @returns {string} sys_id of the catalog.
		 */
		getID(): string
		
		/**
		 *
		 * Returns the title of the catalog.
		 *
		 *
		 * @returns {string} Title of the catalog
		 */
		getTitle(): string
		
		/**
		 *
		 * Specifies if the catalog has categories.
		 *
		 *
		 * @returns {boolean} Returns true if the catalog has categories. Else returns false.
		 */
		hasCategories(): boolean
		
		/**
		 *
		 * Specifies if the catalog has catalog items.
		 *
		 *
		 * @returns {boolean} Returns true if the catalog has catalog items. Else returns false.
		 */
		hasItems(): boolean
		
		/**
		 *
		 * Specifies if the wish list is enabled for a catalog.
		 *
		 *
		 * @returns {boolean} Returns true if wish list is enabled for a catalog. Else returns false.
		 */
		isWishlistEnabled(): boolean
		
	}
	
	/** 
	 * To use this class in a scoped application, use the sn_sc namespace identifier. The Service Catalog Scoped API plugin (ID: com.glideapp.servicecatalog.scoped.api) that is enabled by default is required to access the CatalogSearch API.
	 * 
	 */
	class CatalogSearch {
	
		/**
		 *
		 *
		 */
		constructor()
		
		/**
		 *
		 * Searches a catalog item based on a search term. The search can be narrowed down to a catalog category level.
		 *
		 * @param {string} catalogID Identifier of the catalog to search.
		 * @param {string} categoryID Identifier of the catalog category to search.
		 * @param {boolean} mobile Flag that indicates whether catalog items exposed for mobile are searched.
		 * 
		 * Valid values:
		 * 
		 * *   true: Search for mobile catalog items.
		 * *   false: Do not search for mobile catalog items.
		 * @param {boolean} depthSearch Flag that indicates whether to search subcategories.
		 * 
		 * Valid values:
		 * 
		 * *   true: Do not search subcategories.
		 * *   false: Search subcategories.
		 * @param {string} term Search term.
		 *
		 * @returns {GlideRecord} Returns the GlideRecord on sc_cat_item matching the search result.
		 */
		undefined(catalogID: string, categoryID: string, mobile: boolean, term: string, depthSearch: boolean): GlideRecord
		
	}
	
	/** 
	 */
	class CatCategory {
	
		/**
		 *
		 * Adds the Available For user criteria to a catalog category.
		 *
		 * @param {string} action Specify add to add the user criteria to the Available For list.
		 * 
		 * Specify delete to delete the user criteria from the Available For list.
		 * @param {{[fieldName: string]: string}} criteriaIDs Array of the user criteria sys_ids.
		 *
		 * @returns {void} Method does not return a value
		 */
		availableForUserCriteria(action: string, criteriaIDs: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Determines whether a specified user can view a specified category on a mobile device or desktop.
		 *
		 * @param {boolean} isMobile Flag that indicates whether to verify the user for access on a mobile device or desktop.
		 * 
		 * *   true: validate for mobile.
		 * *   false: validate for desktop.
		 * @param {string} userSysId Unique identifier of the user to validate.
		 *
		 * @returns {boolean} Flag that indicates whether the user can view the associated category.
		 * 
		 * *   true: user can view the category.
		 * *   false: user cannot view the category.
		 */
		canView(isMobile: boolean, userSysId: string): boolean
		
		/**
		 *
		 * Insert the defined category.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {string} Return the sys_id of the inserted variable record.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Deletes the category record on which the CatCategory class was initially instantiated.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(standardUpdate: boolean): void
		
		/**
		 *
		 * Returns the sys_id of the category.
		 *
		 *
		 * @returns {string} sys_id of the category.
		 */
		getID(): string
		
		/**
		 *
		 * Adds the Not Available For user criteria to a catalog category.
		 *
		 * @param {string} action Specify add to add the user criteria to the Not Available For list.
		 * 
		 * Specify delete to delete the user criteria from the Not Available For list.
		 *
		 * @returns {void} Method does not return a value
		 */
		notAvailableForUserCriteria(action: string): void
		
		/**
		 *
		 * Get a mapping of the category.
		 *
		 * @param {{[fieldName: string]: string}} columns Specify the set of columns that you would like the values for.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {{[fieldName: string]: string}} An object mapping column names to values.
		 */
		read(columns: {[fieldName: string]: string}, standardUpdate: boolean): {[fieldName: string]: string}
		
		/**
		 *
		 * Define attribute values for this category.
		 *
		 * @param {{[fieldName: string]: string}} attributes Set the attributes for new field and value pairs.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Define the table name for this category.
		 *
		 * @param {string} tableName Specify the name of the table that extends sc_category.
		 *
		 * @returns {void} Method does not return a value
		 */
		setTableName(tableName: string): void
		
		/**
		 *
		 * Use to update current category.
		 *
		 * @param {{[fieldName: string]: string}} columnValues Object mapping column names to values.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		update(columnValues: {[fieldName: string]: string}, standardUpdate: boolean): void
		
	}
	
	/** 
	 */
	class CatItem {
	
		/**
		 *
		 * Adds the Available For user criteria to a catalog item.
		 *
		 * @param {string} action Specify add to add the user criteria to the Available For list.
		 * 
		 * Specify delete to delete the user criteria from the Available For list.
		 * @param {{[fieldName: string]: string}} criteriaIDs Array of the user criteria sys_ids.
		 *
		 * @returns {void} Method does not return a value
		 */
		availableForUserCriteria(action: string, criteriaIDs: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Verifies whether the current catalog item is viewable in the selected domain (domain selected in the domain picker).
		 *
		 * Catalog items in the global domain are available across all domains.
		 *
		 *
		 * @returns {boolean} Flag that validates whether the current catalog item is viewable in the selected domain.
		 * 
		 * Valid values:
		 * 
		 * *   true: Catalog item is viewable in the domain
		 * *   false: Catalog item is not viewable in the domain
		 */
		canViewInDomain(): boolean
		
		/**
		 *
		 * Specifies if the user has access to view the catalog item on global search.
		 *
		 * @param {boolean} isMobile True if the search is in mobile view. Else, false.
		 *
		 * @returns {boolean} Returns true if the user has access to view the catalog item on global search. Else, returns false.
		 */
		canViewOnSearch(isMobile: boolean): boolean
		
		/**
		 *
		 * Inserts the defined catalog item.
		 *
		 * @param {boolean} standardUpdate Flag that indicates whether to enable the running of engines and workflow.
		 * 
		 * Valid values:
		 * 
		 * *   true: Enable the running of engines and workflow.
		 * *   false: Do not enable the running of engines and workflow. Note that the created and updated system date columns on the table are not updated.
		 *
		 * @returns {string} Sys_id of the newly created catalog item.
		 */
		create(standardUpdate: boolean): string
		
		/**
		 *
		 * Delete the defined catalog item.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		deleteRecord(standardUpdate: boolean): void
		
		/**
		 *
		 * Specifies the first category that the user can view in a catalog.
		 *
		 * @param {string} catalogId sys_id of the catalog.
		 *
		 * @returns {string} sys_id of the first category that the user can view in a catalog.
		 */
		getFirstAccessibleCategoryForSearch(catalogId: string): string
		
		/**
		 *
		 * Returns an array of users for whom the associated item cannot be delegated (requested on behalf of).
		 *
		 * The method verifies each of the users passed in the array.
		 *
		 * @param {{[fieldName: string]: string}} requestForUsers Array of user sys_ids to check whether the associated user can acquire the current item and that the item can be requested on behalf of them. User sys_ids are located in the Users [sys_user] table.
		 *
		 * @returns {{[fieldName: string]: string}} List of user names (Name column from Users [sys_user] table) for whom the item cannot be requested for by a delegate.
		 */
		getInvalidDelegatedUsers(requestForUsers: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Returns the class name for the current catalog item record.
		 *
		 *
		 * @returns {string} Class name for the current catalog item record.
		 */
		getRecordClass(): string
		
		/**
		 *
		 * Verifies whether the specified delegated user has acquisition rights to the current service catalog item.
		 *
		 * @param {string} delegatedUser Optional. Sys_id of the user to request the service catalog item for (delegate). The method verifies whether the user has acquisition rights to the item.
		 * 
		 * Default: Checks whether the calling user has acquisition rights to the item.
		 *
		 * @returns {boolean} Flag that indicates whether the user has acquisition rights to the current service catalog item.
		 * 
		 * Valid values:
		 * 
		 * *   true: User has acquisition rights to the item.
		 * *   false: User does not have acquisition rights to the item.
		 */
		isDelegationAllowed(delegatedUser: string): boolean
		
		/**
		 *
		 * Specifies if the catalog item is available in service portal.
		 *
		 *
		 * @returns {boolean} Returns true if the catalog item is available in service portal. Else, returns false.
		 */
		isVisibleServicePortal(): boolean
		
		/**
		 *
		 * Adds the Not Available For user criteria to a catalog item.
		 *
		 * @param {string} action Specify add to add the user criteria to the Not Available For list.
		 * 
		 * Specify delete to delete the user criteria from the Not Available For list.
		 *
		 * @returns {void} Method does not return a value
		 */
		notAvailableForUserCriteria(action: string): void
		
		/**
		 *
		 * Get a mapping of catalog item attribute values.
		 *
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 * @param {{[fieldName: string]: string}} columns Specify the set of columns that you would like the values for.
		 *
		 * @returns {{[fieldName: string]: string}} An object mapping column names to values.
		 */
		read(standardUpdate: boolean, columns: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Define attribute values for this catalog item.
		 *
		 * @param {{[fieldName: string]: string}} attributes An object mapping column names to values.
		 *
		 * @returns {void} Method does not return a value
		 */
		setAttributes(attributes: {[fieldName: string]: string}): void
		
		/**
		 *
		 * Define the catalogs that this catalog item is associated with.
		 *
		 * @param {string} catalogs Specify comma-separated list of catalogs that you would like the item to be associated with.
		 *
		 * @returns {void} Method does not return a value
		 */
		setCatalogs(catalogs: string): void
		
		/**
		 *
		 * Define the categories that this catalog item is associated with.
		 *
		 * @param {string} categories Specify comma-separated list of categories that you would like the item to be associated with.
		 *
		 * @returns {void} Method does not return a value
		 */
		setCategories(categories: string): void
		
		/**
		 *
		 * Set the image of a catalog item to a database image record.
		 *
		 * @param {string} dbImageSysId sys_id of an attachment referencing the db_image.
		 * @param {string} type Type can be picture or an icon.
		 *
		 * @returns {void} Method does not return a value
		 */
		setImage(dbImageSysId: string, type: string): void
		
		/**
		 *
		 * Define the table name for this catalog item.
		 *
		 * @param {string} tableName Specify the name of the table that extends sc_cat_item.
		 *
		 * @returns {void} Method does not return a value
		 */
		setTableName(tableName: string): void
		
		/**
		 *
		 * Use to update current catalog item with set values.
		 *
		 * @param {{[fieldName: string]: string}} columnValues An object mapping column names to values.
		 * @param {boolean} standardUpdate Set to true to enable the running of engines and workflow.
		 *
		 * @returns {void} Method does not return a value
		 */
		update(columnValues: {[fieldName: string]: string}, standardUpdate: boolean): void
		
	}
	
	/** 
	 * To use this class in a scoped application, use the sn_sc namespace identifier. The Service Catalog Scoped API plugin (com.glideapp.servicecatalog.scoped.api) that is enabled by default is required to access the OrderGuide API.
	 * 
	 */
	class OrderGuide {
	
		/**
		 *
		 * @param {string} sys_id sys_id of the OrderGuide.
		 *
		 */
		constructor(sys_id: string)
		
		/**
		 *
		 * Returns the sys_id of the order guide.
		 *
		 *
		 * @returns {string} sys_id of the order guide.
		 */
		getID(): string
		
		/**
		 *
		 * Initialises the order guide with the specified catalog items and the variables, and returns the order guide.
		 *
		 * @param {{[fieldName: string]: string}} request A JSON object with the Catalog item and variable details.
		 *
		 * @returns {{[fieldName: string]: string}} A JSON object with the initialised order guide details.
		 */
		init(request: {[fieldName: string]: string}): {[fieldName: string]: string}
		
		/**
		 *
		 * Specifies if the Show Include Toggle (include_items) check box is selected for the specified order guide.
		 *
		 * Note: The Show Include Toggle field does not appear on the Order guide form by default.
		 *
		 *
		 * @returns {boolean} Returns true if the Show Include Toggle check box is selected for the specified order guide. Else, returns false.
		 */
		isIncludeItems(): boolean
		
		/**
		 *
		 * Specifies if the two-step checkout is enabled.
		 *
		 *
		 * @returns {boolean} Returns true if the two-step checkout is enabled. Else returns false.
		 */
		isTwoStep(): boolean
		
		/**
		 *
		 * Specifies if a separate cart (different from that for catalog items) usage is enabled for a two-step order guide.
		 *
		 *
		 * @returns {boolean} Returns true if a separate cart usage is enabled for a two-step order guide. Else, returns false.
		 */
		isUseCustomCart(): boolean
		
		/**
		 *
		 * Navigates to the catalog items of an order guide.
		 *
		 * @param {{[fieldName: string]: string}} itemDetails A JSON object with details of catalog items in the order guide.
		 *
		 * @returns {void} Method does not return a value
		 */
		navigateFromMap(itemDetails: {[fieldName: string]: string}): void
		
	}
	
}