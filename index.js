const java = require("java");
java.classpath.push("lib/jt400-7.8.jar");

const AS400 = java.import('com.ibm.as400.access.AS400');
const ProgramCall = java.import('com.ibm.as400.access.ProgramCall');
const AS400DataType = java.import('com.ibm.as400.access.AS400DataType');
const AS400Text = java.import('com.ibm.as400.access.AS400Text');
const AS400Bin4 = java.import('com.ibm.as400.access.AS400Bin4');
const AS400ZonedDecimal = java.import('com.ibm.as400.access.AS400ZonedDecimal');
const AS400PackedDecimal = java.import('com.ibm.as400.access.AS400PackedDecimal');
const AS400Array = java.import('com.ibm.as400.access.AS400Array');
const AS400Structure = java.import('com.ibm.as400.access.AS400Structure');
const ProgramParameter = java.import('com.ibm.as400.access.ProgramParameter');

var BigNumber = require('bignumber.js');

class Pgm {
	constructor(host, user, password, pgmPath) {
		this.host=host;
		this.user=user;
		this.password=password;
		this.pgmPath=pgmPath;
		
		this.model=null;
		
		this.returnObj=null;
		
		return this;
	}
	
	//Before running pgm call, set model and input data
	setParams(model, data) {
		
		this.model=model;
		
		var paramArray=new Array();
		
		for(var i=0;i<model.length;i++) {
			var field=model[i];
			
			if(field.type == 'array' && field.kind == 'in') {
				model[i].size = data[field.name].length;
			}
			
			var pp=this.generateProgramParameterFromField(field,data[field.name]);
			
			paramArray.push(pp);
		}
		
		this.pplist = java.newArray('com.ibm.as400.access.ProgramParameter', paramArray);
	}
	
	//Run pgm call 
	async run() {
		const conn = new AS400(this.host,this.user,this.password);
		
		var pgm = new ProgramCall(conn);
		
		pgm.setProgramSync(this.pgmPath, this.pplist);
		
		if (pgm.runSync() != true) {
			
			var messageList=pgm.getMessageListSync();
			var msg="";
			for (var i=0 ; i < messageList.length; i++) {
				msg+=messageList[i].getTextSync();
			}
			
			throw msg;
		} else {
			
			this.returnObj={};
			
			for(var i=0;i<this.model.length;i++) {
				var obj=this.generateObjectFromProgramParameter(this.model[i],this.pplist[i]);
				
				this.returnObj[this.model[i].name]=obj;
			}
			
			return this.returnObj;
		}
	}
	
	//Transform json model to ProgramParameter and inject input data
	generateProgramParameterFromField(field,data) {
		var param=null;
		
		var passBy=ProgramParameter.PASS_BY_VALUE;
		
		if(field.kind!=null && (field.kind == "inout" ||  field.kind == "out")) {
			passBy=ProgramParameter.PASS_BY_REFERENCE;
		}
		
		switch(field.type) {
			case "text" : 
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(new AS400Text(field.size).toBytesSync(data))))
				} else {
					param=new ProgramParameter(passBy,new AS400Text(field.size).getByteLengthSync())
				}
				
				break;
			case "bin4" : 
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(new AS400Bin4().toBytesSync(data))))
				} else {
					param=new ProgramParameter(passBy,new AS400Bin4().getByteLengthSync())
				}
				
				break;
			case "zoned" : 
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(new AS400ZonedDecimal(field.size, field.precision).toBytesSync(data))))
				} else {
					param=new ProgramParameter(passBy,new AS400ZonedDecimal(field.size, field.precision).getByteLengthSync())
				}
				
				break;
			case "packed" : 
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(new AS400PackedDecimal(field.size, field.precision).toBytesSync(data))))
				} else {
					param=new ProgramParameter(passBy,new AS400PackedDecimal(field.size, field.precision).getByteLengthSync())
				}
				
				break;
			case "array" : 
				var struct=this.generateAs400StructureFromArrayObjectStruct(field.struct);
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					
					var dataArray=new Array();
					
					for(var i = 0 ; i < data.length ; i++) {
						dataArray.push(Object.values(data[i]));
					}
					
					var objectArray=new AS400Array(struct, data.length);
					
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(objectArray.toBytesSync(dataArray))));
						
				} else {
					param=new ProgramParameter(new AS400Array(struct, field.size).getByteLengthSync())
				}
				
				break;
			case "struct" : 
				var struct=this.generateAs400StructureFromArrayObjectStruct(field.struct);
				
				if(data!=null && (field.kind == "inout" ||  field.kind == "in")) {
					param=new ProgramParameter(passBy,java.newArray('byte',Array.from(struct.toBytesSync(Object.values(data)))));
				} else {
					param=new ProgramParameter(passBy,struct.getByteLengthSync())
				}
				
				break;
		}
		
		return param;
	}
	
	//Transform input and output ProgramParameter data to js object value
	generateObjectFromProgramParameter(objModel, param) {
		
		var res=null;
		
		var data=param.getOutputDataSync();
		
		if(objModel.kind == 'in') {
			data=param.getInputDataSync();
		}
		
		if(data!=null) {
			
			var val=java.newArray('byte',Array.from(data));
			
			switch(objModel.type) {
				case "text" : res=new AS400Text(objModel.size).toObjectSync(val).trim(); break;
				case "bin4" : res=new AS400Bin4().toObjectSync(val); break;
				case "zoned" : res=new AS400ZonedDecimal(objModel.size, objModel.precision).toObjectSync(val); break;
				case "packed" : res=new AS400PackedDecimal(objModel.size, objModel.precision).toObjectSync(val); break;
				case "array" : 
					
					var size=objModel.size;
					
					if(this.returnObj[objModel.nboccurField]!=null) {
						size=parseInt(this.returnObj[objModel.nboccurField]);
					}
					
					var objectArray=new AS400Array(this.generateAs400StructureFromArrayObjectStruct(objModel.struct), size).toObjectSync(val); 
					res=new Array();
					for(var i = 0 ; i < objectArray.length ; i++) {
						res.push(this.generateDataObjectFromStructAndObject(objModel.struct, objectArray[i]));
					}
					break;
				case "struct" : 
					var obj=this.generateAs400StructureFromArrayObjectStruct().toObjectSync(val);
					res=this.generateDataObjectFromStructAndObject(objModel.struct, obj);
					break;
			}
		}
		
		return res;
	}
	
	//Generate As400Structure from json structure
	generateAs400StructureFromArrayObjectStruct(arrayObj) {
		
		var arrayParam=new Array();
		
		for(var i in arrayObj) {
			
			var field=arrayObj[i];
			
			switch(field.type) {
				case "text" : arrayParam.push(new AS400Text(field.size)); break;
				case "bin4" : arrayParam.push(new AS400Bin4()); break;
				case "zoned" : arrayParam.push(new AS400ZonedDecimal(field.size, field.precision)); break;
				case "packed" : arrayParam.push(new AS400PackedDecimal(field.size, field.precision)); break;
			}
		}
		
		var dt = java.newArray('com.ibm.as400.access.AS400DataType', arrayParam); 
		
		return new AS400Structure(dt);
	}
	
	//Generate json object from plain jt400 response and structure
	generateDataObjectFromStructAndObject(struct, obj) {
		
		var res={};
		
		for (var i = 0 ; i < struct.length ; i++) {
			
			if(struct[i].type == "text") {
				res[struct[i].name]=obj[i].trim();
			} else if(struct[i].type == "bin4") {
				res[struct[i].name]=parseInt(obj[i]);
			} else if(struct[i].type == "zoned" || struct[i].type == "packed") {
				res[struct[i].name]=new BigNumber(obj[i]).toFixed(struct[i].precision).padStart(struct[i].size, "0");
			} 
			
		}
		
		return res;
	}
}

module.exports=Pgm;