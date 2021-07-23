sap.ui.define(["sap/ui/core/format/NumberFormat"], function (NumberFormat) {
	"use strict";

	return {
        /**
		 * Format JS Date object to OData date format 
		 * @public
		 * @param {Date} oValue the date field
		 * @returns {String} sValue in OData format yyyy-MM-ddTHH:mm:ss
		 */
		formatDate : function (oValue) {
			if (!oValue) {
				oValue = new Date();
            }
            return oValue.getUTCFullYear()+'-'+(oValue.getUTCMonth()+1)+'-'+oValue.getUTCDate()+'T00:00:00';
        },

        formatDateToOdata : function (oValue) {
			if (!oValue) {
				oValue = new Date();
            }
            
            var sTimeStamp = oValue.getTime();
            return "/Date("+sTimeStamp+")/";
        },

        /**
		 * Format JS Date object to OData Time format 
		 * @public
		 * @param {Date} oValue the date field
		 * @returns {String} sValue in OData Time format
		 */
        formatTime: function(oValue) {
            if (!oValue) {
				oValue = new Date();
            }
            return oValue.getHours() + ":" + oValue.getMinutes() + ":" + oValue.getSeconds();
        },

        formatPrice: function(price, currency) {
            var oCurrency = new sap.ui.model.type.Currency({
                showMeasure: false,
                groupingSeparator: ".",
                decimalSeparator: ",",
                decimals: 2,
                minFractionDigits: 2,
                maxFractionDigits: 2              
            });

            var formattedPrice = oCurrency.formatValue([price], "string");
            return formattedPrice + " " + currency;

        },

        formatPriceNoCurr: function(price) {
            var oCurrency = new sap.ui.model.type.Currency({
                showMeasure: false,
                groupingSeparator: ".",
                decimalSeparator: ",",
                decimals: 2,
                minFractionDigits: 2,
                maxFractionDigits: 2           
            });

            var formattedPrice = oCurrency.formatValue([price], "string");
            return formattedPrice;

        },

        formatUnidades: function(unidades) {
            var oCurrency = new sap.ui.model.type.Currency({
                showMeasure: false,
                groupingSeparator: ".",
                decimalSeparator: ",",
                decimals: 5,
                minFractionDigits: 5,
                maxFractionDigits: 5          
            });

            var formattedUnit = oCurrency.formatValue([unidades], "string");
            return formattedUnit;

        },

        formatPorcentaje: function(porcentaje) {
            var oCurrency = new sap.ui.model.type.Currency({
                showMeasure: false,
                groupingSeparator: ".",
                decimalSeparator: ",",
                decimals: 2,
                minFractionDigits: 2,
                maxFractionDigits: 2          
            });

            var formattedPerc = oCurrency.formatValue([porcentaje], "string");
            return formattedPerc + " %";
        }
    };
});    