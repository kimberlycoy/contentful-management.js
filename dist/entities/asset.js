'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.wrapAsset = wrapAsset;
exports.wrapAssetCollection = wrapAssetCollection;

var _cloneDeep = require('lodash/cloneDeep');

var _cloneDeep2 = _interopRequireDefault(_cloneDeep);

var _freezeSys = require('contentful-sdk-core/freeze-sys');

var _freezeSys2 = _interopRequireDefault(_freezeSys);

var _enhanceWithMethods = require('../enhance-with-methods');

var _enhanceWithMethods2 = _interopRequireDefault(_enhanceWithMethods);

var _toPlainObject = require('contentful-sdk-core/mixins/to-plain-object');

var _toPlainObject2 = _interopRequireDefault(_toPlainObject);

var _errorHandler = require('../error-handler');

var _errorHandler2 = _interopRequireDefault(_errorHandler);

var _instanceActions = require('../instance-actions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ASSET_PROCESSING_CHECK_WAIT = process.env.ASSET_PROCESSING_CHECK_WAIT || 500;
var ASSET_PROCESSING_CHECK_RETRIES = process.env.ASSET_PROCESSING_CHECK_RETRIES || 5;

/**
 * @typedef {Asset} Asset
 * @property {Object} sys - Standard system metadata with additional asset specific properties
 * @property {string} sys.locale - If present, indicates the locale which this asset uses
 * @property {Object} fields - Object with content for each field
 * @property {string} fields.title - Title for this asset
 * @property {string} fields.description - Description for this asset
 * @property {Object} fields.file - File object for this asset
 * @property {Object} fields.file.fileName - Name for the file
 * @property {string} fields.file.contentType - Mime type for the file
 * @property {string} fields.file.upload - Url where the file is available to be downloaded from, into the Contentful asset system. After the asset is processed this field is gone.
 * @property {string} fields.file.url - Url where the file is available at the Contentful media asset system. This field won't be available until the asset is processed.
 * @property {Object} fields.file.details - Details for the file, depending on file type (example: image size in bytes, etc)
 * @property {boolean} isPublished - checks if the asset is published. A published asset might have unpublished changes (@see {Asset.isUpdated})
 * @property {boolean} isUpdated - Checks if the asset is updated. This means the asset was previously published but has unpublished changes.
 * @property {boolean} isArchived - Checks if asset is archived. This means it's not exposed to the Delivery/Preview APIs.
 * @property {boolean} isDraft - Checks if the asset is in draft mode. This means it is not published.
 * @property {function(): Promise<Asset>} update - Updates an asset
 * @property {function(): Promise<Asset>} delete - Deletes an asset
 * @property {function(): Promise<Asset>} publish - publish an asset
 * @property {function(): Promise<Asset>} unPublish - unPublish an asset
 * @property {function(): Promise<Asset>} archive - archive an asset
 * @property {function(): Promise<Asset>} unArchive - unArchive an asset
 * @property {function(locale: string, options: {processingCheckWait: number, processingCheckRetries: number}): Promise<Asset>} processForLocale - Triggers asset processing after an upload, for the file uploaded to a specific locale.
 * @property {function(options: {processingCheckWait: number, processingCheckRetries: number}): Promise<Asset>} processForAllLocales - Triggers asset processing after an upload, for the files uploaded to all locales of an asset.
 * @property {function(): Object} toPlainObject - Returns this Asset as a plain JS object
 * @example
 * 
 * // require contentful-management
 * var contentfulManagement = require('contentful-management')
 * var client = contentfulManagement.createClient({
 * // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
 * accessToken: 'YOUR_ACCESS_TOKEN'
 * }) 
 * 
 * var space = await client.getSpace('SPACE_ID')
 * var asset = await space.getAsset('ASSET_ID') 
 * 
 * // Example Creating an asset
 * var createdAsset = await space.createAsset(
 *   fields: {
 *     file: {
 *       'en-US': {
 *          contentType: 'image/jpeg',
 *          fileName: 'filename_english.jpg',
 *          upload: 'http://example.com/filename_original_en.jpg'
 *       },
 *       'de-DE': {
 *          contentType: 'image/jpeg',
 *          fileName: 'filename_german.jpg',
 *          upload: 'http://example.com/filename_original_de.jpg'
 *       }
 *     }
 *   }
 * )
 * 
 * // Example Updating an asset
 * asset.fields.title = 'My new Title'
 * asset.update()
 * .then(asset => console.log(asset.fields.name['en-US']))
 * 
 * // Process an asset for a specific locale
 * asset.processForLocale('en-US')
 * .then(asset => console.log(asset.fields.file['en-US'].url))
 * 
 * // Process Asset for all locales
 * asset.processForAllLocales()
 * .then(asset => console.log(asset.fields.file['en-US'].url, asset.fields.file['de-DE'].url))
 * 
 * // Publish an asset
 * asset.publish()
 * .then(asset => console.log(asset.sys.publishedVersion))
 * 
 * // Delete an asset
 * asset.delete()
 * .catch(err => console.log(err))
 * 
 * // unPublish an asset
 * asset.unpublish()
 * .then(asset => console.log(asset.sys))
 * 
 * // archive an asset
 * asset.archive()
 * .then(asset => console.log(asset.sys.archivedVersion))
 * 
 * // unarchive an asset
 * asset.unarchive()
 * .then(asset => console.log(asset.sys))
 */

/**
 * @typedef {AssetCollection} AssetCollection
 * @property {number} total - Total amount of records in the server
 * @property {number} skip - A starting point of the collection
 * @property {number} limit - Amount of records in collection
 * @property {Asset[]} items - an array of assets
 * @property {function(): Object} toPlainObject - Returns this Asset collection as a plain JS object
 * @example
 * 
 * // require contentful-management
 * var contentfulManagement = require('contentful-management')
 * var client = contentfulManagement.createClient({
 * // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
 * accessToken: 'YOUR_ACCESS_TOKEN'
 * }) 
 * 
 * let space = await client.getSpace('SPACE_ID')
 * let assetCollection = await space.getAssets()
 * console.log("the space contains ", assetCollection.items.length, " assets")
 * assetCollection.items.forEach((asset) => {
 *    // do something with asset @link {Asset}
 * })
 */
function createAssetApi(http) {
  function checkIfAssetHasUrl(_ref) {
    var resolve = _ref.resolve,
        reject = _ref.reject,
        id = _ref.id,
        locale = _ref.locale,
        _ref$processingCheckW = _ref.processingCheckWait,
        processingCheckWait = _ref$processingCheckW === undefined ? ASSET_PROCESSING_CHECK_WAIT : _ref$processingCheckW,
        _ref$processingCheckR = _ref.processingCheckRetries,
        processingCheckRetries = _ref$processingCheckR === undefined ? ASSET_PROCESSING_CHECK_RETRIES : _ref$processingCheckR,
        _ref$checkCount = _ref.checkCount,
        checkCount = _ref$checkCount === undefined ? 0 : _ref$checkCount;

    http.get('assets/' + id).then(function (response) {
      return wrapAsset(http, response.data);
    }, _errorHandler2.default).then(function (asset) {
      if (asset.fields.file[locale].url) {
        resolve(asset);
      } else if (checkCount === processingCheckRetries) {
        var error = new Error();
        error.name = 'AssetProcessingTimeout';
        error.message = 'Asset is taking longer then expected to process.';
        reject(error);
      } else {
        checkCount++;
        setTimeout(function () {
          return checkIfAssetHasUrl({
            resolve: resolve,
            reject: reject,
            id: id,
            locale: locale,
            checkCount: checkCount,
            processingCheckWait: processingCheckWait,
            processingCheckRetries: processingCheckRetries
          });
        }, processingCheckWait);
      }
    });
  }

  function processForLocale(locale) {
    var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        processingCheckWait = _ref2.processingCheckWait,
        processingCheckRetries = _ref2.processingCheckRetries;

    var assetId = this.sys.id;
    return http.put('assets/' + this.sys.id + '/files/' + locale + '/process', null, {
      headers: {
        'X-Contentful-Version': this.sys.version
      }
    }).then(function () {
      return new _promise2.default(function (resolve, reject) {
        return checkIfAssetHasUrl({
          resolve: resolve,
          reject: reject,
          id: assetId,
          locale: locale,
          processingCheckWait: processingCheckWait,
          processingCheckRetries: processingCheckRetries
        });
      });
    }, _errorHandler2.default);
  }

  function processForAllLocales() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var self = this;
    var locales = (0, _keys2.default)(this.fields.file);
    return _promise2.default.all(locales.map(function (locale) {
      return processForLocale.call(self, locale, options);
    })).then(function (assets) {
      return assets[0];
    });
  }

  return {
    /**
     * Sends an update to the server with any changes made to the object's properties
     * @memberof Asset
     * @func update
     * @return {Promise<Asset>} Object returned from the server with updated changes.
     * @example
     */
    update: (0, _instanceActions.createUpdateEntity)({
      http: http,
      entityPath: 'assets',
      wrapperMethod: wrapAsset
    }),

    /**
     * Deletes this object on the server.
     * @memberof Asset
     * @func delete
     * @return {Promise} Promise for the deletion. It contains no data, but the Promise error case should be handled.
     * @example
     */
    delete: (0, _instanceActions.createDeleteEntity)({
      http: http,
      entityPath: 'assets'
    }),

    /**
     * Publishes the object
     * @memberof Asset
     * @func publish
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @example
     */
    publish: (0, _instanceActions.createPublishEntity)({
      http: http,
      entityPath: 'assets',
      wrapperMethod: wrapAsset
    }),

    /**
     * Unpublishes the object
     * @memberof Asset
     * @func unpublish
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @example
     */
    unpublish: (0, _instanceActions.createUnpublishEntity)({
      http: http,
      entityPath: 'assets',
      wrapperMethod: wrapAsset
    }),

    /**
     * Archives the object
     * @memberof Asset
     * @func archive
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @example
     */
    archive: (0, _instanceActions.createArchiveEntity)({
      http: http,
      entityPath: 'assets',
      wrapperMethod: wrapAsset
    }),

    /**
     * Unarchives the object
     * @memberof Asset
     * @func unarchive
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @example
     */
    unarchive: (0, _instanceActions.createUnarchiveEntity)({
      http: http,
      entityPath: 'assets',
      wrapperMethod: wrapAsset
    }),

    /**
     * Triggers asset processing after an upload, for the file uploaded to a specific locale.
     * @memberof Asset
     * @func processForLocale
     * @param {string} locale - Locale which processing should be triggered for
     * @param {object} options - Additional options for processing
     * @prop {number} options.processingCheckWait - Time in milliseconds to wait before checking again if the asset has been processed (default: 500ms)
     * @prop {number} options.processingCheckRetries - Maximum amount of times to check if the asset has been processed (default: 5)
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @throws {AssetProcessingTimeout} If the asset takes too long to process. If this happens, retrieve the asset again, and if the url property is available, then processing has succeeded. If not, your file might be damaged.
     * @example
     */
    processForLocale: processForLocale,

    /**
     * Triggers asset processing after an upload, for the files uploaded to all locales of an asset.
     * @memberof Asset
     * @func processForAllLocales
     * @param {object} options - Additional options for processing
     * @prop {number} options.processingCheckWait - Time in milliseconds to wait before checking again if the asset has been processed (default: 500ms)
     * @prop {number} options.processingCheckRetries - Maximum amount of times to check if the asset has been processed (default: 5)
     * @return {Promise<Asset>} Object returned from the server with updated metadata.
     * @throws {AssetProcessingTimeout} If the asset takes too long to process. If this happens, retrieve the asset again, and if the url property is available, then processing has succeeded. If not, your file might be damaged.
     * @example
     * asset.processForAllLocales()
     * .then(asset => console.log(asset.fields.file['en-US'].url, asset.fields.file['de-DE'].url))
     */
    processForAllLocales: processForAllLocales,

    /**
     * Checks if the asset is published. A published asset might have unpublished changes (@see {Asset.isUpdated})
     * @memberof Asset
     * @func isPublished
     * @return {boolean}
     */
    isPublished: (0, _instanceActions.createPublishedChecker)(),

    /**
     * Checks if the asset is updated. This means the asset was previously published but has unpublished changes.
     * @memberof Asset
     * @func isUpdated
     * @return {boolean}
     */
    isUpdated: (0, _instanceActions.createUpdatedChecker)(),

    /**
     * Checks if the asset is in draft mode. This means it is not published.
     * @memberof Asset
     * @func isDraft
     * @return {boolean}
     */
    isDraft: (0, _instanceActions.createDraftChecker)(),

    /**
     * Checks if asset is archived. This means it's not exposed to the Delivery/Preview APIs.
     * @memberof Asset
     * @func isArchived
     * @return {boolean}
     */
    isArchived: (0, _instanceActions.createArchivedChecker)()
  };
}

/**
 * @private
 * @param {Object} http - HTTP client instance
 * @param {Object} data - Raw asset data
 * @return {Asset} Wrapped asset data
 */
function wrapAsset(http, data) {
  var asset = (0, _toPlainObject2.default)((0, _cloneDeep2.default)(data));
  (0, _enhanceWithMethods2.default)(asset, createAssetApi(http));
  return (0, _freezeSys2.default)(asset);
}

/**
 * @private
 * @param {Object} http - HTTP client instance
 * @param {Object} data - Raw asset collection data
 * @return {AssetCollection} Wrapped asset collection data
 */
function wrapAssetCollection(http, data) {
  var assets = (0, _toPlainObject2.default)((0, _cloneDeep2.default)(data));
  assets.items = assets.items.map(function (entity) {
    return wrapAsset(http, entity);
  });
  return (0, _freezeSys2.default)(assets);
}