sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "../service/Workflow",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../model/formatter"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, Workflow, Filter, FilterOperator, JSONModel, MessageBox, formatter) {
        "use strict";
        var oThat, path, sCreatedByUser;

		return Controller.extend("com.nespola.aprobacionordendecompra.controller.App", {
            formatter: formatter,
			onInit: function () {
                oThat = this;
                
                oThat.getLoggedUser().then(function (data) {
                                sCreatedByUser = data.Resources[0].userName.toUpperCase();
                            });
                oThat.onGetMyInbox($.getComponentDataMyInbox);
                oThat.onCreateButtonAction();   
            },
            
            getLoggedUser: function () {   
                 
                try {
                return new Promise(function (resolve, reject) {
                    if(sap.ushell !== undefined){         
                        var sMail = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
                            if (sMail === undefined) {
                                sMail = "";
                            }
                    }
                
                     var userModel = new JSONModel({});
                    var sPath = $.appModulePath + "/iasscim/service/scim/Users?filter=emails eq '" + sMail + "'";
                    userModel.loadData(sPath, null, true, 'GET', null, null, {
                        'Content-Type': 'application/scim+json'
                    }).then(() => {
                        var oDataTemp = userModel.getData();
                        resolve(oDataTemp);
                    }).catch(err => {
                        reject("Error");
                    });
                });
                } catch (oError) {
                    sap.m.MessageToast.show(oError);
                }
            },

            onGetMyInbox: function (getComponentDataMyInbox) {
                try {
                    sap.ui.core.BusyIndicator.show(0);
                    var startupParameters = getComponentDataMyInbox === undefined ? undefined : getComponentDataMyInbox.startupParameters;
                    //valida si entra por el workflow
                    //Validacion si estas en en el MyInbox
                    if (startupParameters !== undefined && startupParameters.hasOwnProperty("taskModel")) {
                        var taskModel = startupParameters.taskModel;
                        var taskData = taskModel.getData();

                        startupParameters.inboxAPI.setShowNavButton(false);
                        Workflow.onGetContextWorkflow(taskData).then(function (oContextWorkflow) {

                            // get task description and add it to the model
                            startupParameters.inboxAPI.getDescription("NA", taskData.InstanceID).done(function (dataDescr) {
                                taskModel.setProperty("/task/Description", dataDescr.Description);
                            }).
                                fail(function (errorText) { });
                            
                            ///seteo modelos task y context
                            $.Component.setModel(taskModel, "task");
                            var contextModel = new JSONModel(oContextWorkflow);
                            $.Component.setModel(contextModel, "context");
                            var requesterModel = new JSONModel(oContextWorkflow.requester);
                            $.Component.setModel(requesterModel, "requester");
                            var headerModel = new JSONModel(oContextWorkflow.header); 
                            $.Component.setModel(headerModel, "header");
                            if(oThat.getOwnerComponent() !== undefined){
                            oThat.getOCFields(oContextWorkflow.header.porqs);
                            }           
                        }).catch(function (oError) {
                            debugger;
                            oThat.onErrorMessage(oError, "oErrorGetContext");
                        }).finally(function () {
                            sap.ui.core.BusyIndicator.hide();
                        });
                    } else {
                        sap.ui.core.BusyIndicator.hide();
                    }
                } catch (oError) {
                    debugger;
                    oThat.onErrorMessage(oError, "errorMyInbox");
                }
            },

            getOCFields: async function (sSolNumber) { 
                var filter = [
				new Filter("Porqs", "EQ", sSolNumber),
            ];
                	try {
                        var cabecera = oThat.getOwnerComponent().getModel("header");
                        const aData = await oThat.readOCService(filter);
                        if (aData.results.length > 0) {
                        oThat.getOwnerComponent().getModel("OC").setProperty("/data", aData.results);
                        oThat.getOwnerComponent().getModel("posiciones").setProperty("/data", aData.results[0].ItemSet.results);
                     
                            cabecera.setProperty("/fechaDoc", aData.results[0].Bedat);
                            cabecera.setProperty("/orgCompras", aData.results[0].EkorgDesc);
                            cabecera.setProperty("/proveedor", aData.results[0].LifnrDesc);
                            cabecera.setProperty("/grpCompras", aData.results[0].EkgrpDesc);
                            cabecera.setProperty("/precioNeto", aData.results[0].Netwr);
                            cabecera.setProperty("/sociedad", aData.results[0].BukrsDesc);
                            cabecera.setProperty("/nroSolicitud", aData.results[0].Porqs);
                            cabecera.setProperty("/precioNeto", aData.results[0].Netwr);
			            
                        }
                                    
                        } catch (err) {
                            debugger;
                            sap.m.MessageToast.show("Error al realizar la consulta oData");
                        }
            },

            readOCService: function (filter) {
                return new Promise((res, rej) => {
                    oThat.getOwnerComponent().getModel("ordenCompra").read("/HeaderSet", {
                        filters: filter,
					    urlParameters: {
						    "$expand": "ItemSet"
					    },
                        success: res,
                        error: rej
                    });
                });
		    },

            onCreateButtonAction: function () {
                var startupParameters = $.getComponentDataMyInbox.startupParameters;
                oThat.inboxApi = startupParameters.inboxAPI;
                oThat.inboxApi.removeAction("Aprobar");
                oThat.inboxApi.removeAction("Rechazar");
                oThat.inboxApi.addAction({
                    action: "Aprobar",
                    label: "Aprobar",
                    type: "accept" // (Optional property) Define for positive appearance
                }, function () {
                    oThat.onApprove();                                           
                }, oThat);

                oThat.inboxApi.addAction({
                    action: "Rechazar",
                    label: "Rechazar",
                    type: "reject" // (Optional property) Define for negative appearance
                }, function () {
                        oThat.onReject(); 
                }, oThat);
            },
            //solicitamos confirmación para aprobar la solicitud
            onApprove: function () {
			this.oQuestionDialog = new sap.m.Dialog({
				title: "Aprobar orden",
				type: 'Message',
				content: [
					new sap.m.Label({
						text: "¿Desea aprobar la orden?",
						labelFor: 'rejectDialogTextarea'
					})
				],
				beginButton: new sap.m.Button({
					type: sap.m.ButtonType.Emphasized,
					text: 'Confirmar',
					press: function () {
						this.onApproveConfirm();
					}.bind(this)
				}),
				endButton: new sap.m.Button({
					type: sap.m.ButtonType.Reject,
					text: 'Cancelar',
					press: function () {
						this.onCancelConfirm();
					}.bind(this)
				})
			});
			this.oQuestionDialog.open();
        },
       
        onApproveConfirm: function () {
            this.oQuestionDialog.close();
            var oContextData = $.Component.getModel("context").getData();
          
            //chequear contexto.. si viene level2 llamar odata pasandole "A".                  
                   if (oContextData.level === 3) {
                        oThat.updateSolicitudStatus(oContextData.header.porqs,"A")
                            .then(function (data) {
                                if(data.ReturnSet.results[0].Type === "E"){
                                MessageBox.error(data.ReturnSet.results[0].Message);
                                }else{
                                oThat.completeTask("A");
                                }
                            }, () => {
                                sap.m.MessageToast.show("Error al actualizar estado de la solicitud");
                            });
                    }else{
                        oThat.completeTask("A");
                    }      
        },

        onCancelConfirm: function () {
            this.oQuestionDialog.close();
        },

        //solicitamos confirmación para rechazar la solicitud
            onReject: function () {
			this.oQuestionDialog = new sap.m.Dialog({
				title: "Rechazar orden",
				type: 'Message',
				content: [
					new sap.m.VBox({
                        items: [
                                new sap.m.Label({
						            text: "¿Desea rechazar la orden?",
						            labelFor: 'rejectDialogTextarea'
                                }),
                                new sap.m.TextArea({
                                    placeholder: "Motivo de rechazo.."          
                                })
                                ]
                            
                        })		
				],
				beginButton: new sap.m.Button({
					type: sap.m.ButtonType.Emphasized,
					text: 'Confirmar',
					press: function () {
						this.onRejectConfirm();
					}.bind(this)
				}),
				endButton: new sap.m.Button({
					type: sap.m.ButtonType.Reject,
					text: 'Cancelar',
					press: function () {
						this.onCancelReject();
					}.bind(this)
				})
			});
			this.oQuestionDialog.open();
        },

        onRejectConfirm: function () {
            var textoRechazo = this.oQuestionDialog.getContent()[0].getItems()[1].getValue();
            $.Component.getModel("context").setProperty("/motivoRechazo", textoRechazo);
            this.oQuestionDialog.close();
            var oContextData = $.Component.getModel("context").getData();
            
            //chequear contexto.. si viene level2 llamar odata pasandole "R".                  
                   if (oContextData.level === 2) {
                        oThat.updateSolicitudStatus(oContextData.header.porqs,"R")
                            .then( function (data) {
                                sap.m.MessageToast.show(data.ReturnSet.results[0].Message);
                                oThat.completeTask("R");
                            }, () => {
                                sap.m.MessageToast.show("Error al actualizar estado de Solicitud");
                            });
                    }else{
                        oThat.completeTask("R");
                    }
             },

         completeTask: function (approvalStatus) {               
                //Validar segun la accion
               ////**** */
                    
               //Completar la tarea
               $.Component.getModel("context").setProperty("/aprobadorN1", sCreatedByUser);
                $.Component.getModel("context").setProperty("/accion", approvalStatus);
                Workflow.completeTask();
            },


        onCancelReject: function () {
            this.oQuestionDialog.close();
        },

        updateSolicitudStatus(sSolNumber, sStatus) {
                oThat.getOwnerComponent().getModel().setUseBatch(false);
                return new Promise((res, rej) => {

                    this.getOwnerComponent().getModel().create("/Purchase_order_Req_H_Set", {
                        "Porqs": sSolNumber,
                        "Bsart":"",
                        "Schid": "",
                        "Bukrs": "",
                        "Status": "A",
                        "Ernam": sCreatedByUser,
                        "Swfid": "",
                        "Purchase_order_Req_POS": [],
                        "Purchase_order_Req_Return": []
                    }, {
                        success: res,
                        error: rej
                    })
                });
            }
            
		});
	});
