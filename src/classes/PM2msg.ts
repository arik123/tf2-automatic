import Bot from './Bot';
import log from '../lib/logger';
import { EntryData } from './Pricelist';

export = class PM2msg {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    processMessage(message): boolean {
        log.debug('message: ', message);
        if (!message.type) return false;
        const request: string = message.type; // expected format method:type (pricelist:get)
        if (!(typeof this[request] == 'function')) return false;
        log.debug(request);

        this[request](message.data);
        return true;
    }

    getPricelist(data: any) {
        const prices = this.bot.pricelist.getPrices();
        let ret = [];
        prices.forEach((price) => {
            ret.push(price.getJSON());
        });
        process.send({
            type: 'getPricelist',
            data: {
                ReqID: data.ReqID,
                pricelist: ret
            }
        });
    }

    clearPricelist(data: any) {
        this.bot.pricelist
            .removeAll()
            .then(() => {
                process.send({
                    type: 'clearPricelist',
                    data: {
                        ReqID: data.ReqID,
                        msg: 'Cleared pricelist!'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'clearPricelist',
                    data: {
                        ReqID: data.ReqID,
                        msg: 'Failed to clear pricelist: ' + err.message
                    }
                });
            });        
    }

    getInfo(data: any) {
        const id = this.bot.community.steamID
        //@ts-ignore
        this.bot.client.getPersonas([id]).then((personasRepsonse) => {
            const userData = personasRepsonse.personas[id.toString()];
            const admins = this.bot.getAdmins();
            process.send({
                type: 'getInfo',
                data: {
                    ReqID: data.ReqID,
                    name: userData.player_name,
                    avatar: userData.avatar_url_icon,
                    admins: admins.map(admin => admin.toString())
                }
            });
        });
    }
    removeItem(data: any) {
        log.debug(data);
        if (!data.sku) {
            process.send({
                type: 'removeItem',
                data: {
                    ReqID: data.ReqID,
                    err: 'No SKU specified!'
                }
            });
            return;
        }
        this.bot.pricelist
            .removePrice(data.sku as string, true)
            .then(entry => {
                process.send({
                    type: 'removeItem',
                    data: {
                        ReqID: data.ReqID,
                        msg: 'Removed "' + entry.name + '".'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'removeItem',
                    data: {
                        ReqID: data.ReqID,
                        err: 'Failed to remove pricelist entry: ' + err.message
                    }
                });
            });
    }

    updateItem(data: any) {
        const ReqID = data.ReqID;
        delete data.ReqID;
        if (!data.sku) {
            process.send({
                type: 'updateItem',
                data: {
                    ReqID: ReqID,
                    err: 'No SKU specified!'
                }
            });
            return;
        }
        if (!this.bot.pricelist.hasPrice(data.sku as string)) {
            process.send({
                type: 'updateItem',
                data: {
                    ReqID: ReqID,
                    err: 'Item is not in the pricelist.'
                }
            });
            return;
        }
        const entryData = this.bot.pricelist.getPrice(data.sku as string, false).getJSON();

        delete entryData.time;
        delete data.time;

        // Update entry
        for (const property in data) {
            if (!Object.prototype.hasOwnProperty.call(data, property)) {
                continue;
            }

            entryData[property] = data[property];
        }

        this.bot.pricelist
            .updatePrice(entryData, true)
            .then(entry => {
                process.send({
                    type: 'updateItem',
                    data: {
                        ReqID: ReqID,
                        msg: 'Updated "' + entry.name + '".'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'updateItem',
                    data: {
                        ReqID: ReqID,
                        err: 'Failed to update pricelist entry: ' +
                            (err.body && err.body.message ? err.body.message : err.message)
                    }
                });
            });
    }

    addItem(data: any) {
        const ReqID = data.ReqID;
        delete data.ReqID;
        if (data.enabled === undefined) {
            data.enabled = true;
        }
        if (data.max === undefined) {
            data.max = 1;
        }
        if (data.min === undefined) {
            data.min = 0;
        }
        if (data.intent === undefined) {
            data.intent = 2;
        }

        if (typeof data.buy === 'object') {
            data.buy.keys = data.buy.keys || 0;
            data.buy.metal = data.buy.metal || 0;

            if (data.autoprice === undefined) {
                data.autoprice = false;
            }
        }
        if (typeof data.sell === 'object') {
            data.sell.keys = data.sell.keys || 0;
            data.sell.metal = data.sell.metal || 0;

            if (data.autoprice === undefined) {
                data.autoprice = false;
            }
        }

        if (data.autoprice === undefined) {
            data.autoprice = true;
        }
        this.bot.pricelist
            .addPrice(data as EntryData, true)
            .then(entry => {
                process.send({
                    type: 'addItem',
                    data: {
                        ReqID: ReqID,
                        msg: 'Added "' + entry.name + '".'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'addItem',
                    data: {
                        ReqID: ReqID,
                        err: 'Failed to add the item to the pricelist: ' + err.message
                    }
                });
            });
    }

    getTrades(data: any) {
        process.send({
            type: 'getTrades',
            data: {
                ReqID: data.ReqID,
                polldata: this.bot.manager.pollData
            }
        });
    }
}