document.addEventListener("DOMContentLoaded", loadTable);



function loadTable(){

var req = new XMLHttpRequest();

req.open("get", "http://localhost:50000/regUsers", true);

req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			var res = JSON.parse(req.responseText);
			createTable(res);

		}
		
		else{
			console.log("Error in network request: " + req.statusText);
		}
		
	});
	req.send(null);

}

function bindDelete(theButtons){
	
	for (i = 0; i < theButtons.length; i++){
		
		theButtons[i].addEventListener("click", function(x){
			return function(){
			deleteRow(theButtons[x].attributes.userid.value);
			};
		}(i));
		} 
	
	};


function deleteRow(theRow){
	
	var req = new XMLHttpRequest();
	req.open("GET", "http://localhost:50000/delete-row?UserID=" + theRow, true);
	
	req.addEventListener('load', function(){
	if(req.status >= 200 && req.status < 400)
	{
		var res = JSON.parse(req.responseText);
		createTable(res);
	}
	else{
		console.log("Error in network request: " + req.statusText);
	}
	
	});
	req.send(null);
}
	
	
function createTable(info){

if(document.getElementById("myTable"))
{
	var myNode = document.getElementById("myTable");
	while(myNode.childNodes.length > 2){
		myNode.removeChild(myNode.lastChild);
	}
	for(p in info){
	var newRow = document.createElement("TR");
	newRow.setAttribute("name", "datarow");
	newRow.setAttribute("UserID", info[p].UserID);
	
	
		for(r in info[p]){
			if(r == "UserID" || r == "password" || r == "isAdmin"){}
			else{
			var newCell = document.createElement("TD");
			newCell.textContent = info[p][r];
			newRow.appendChild(newCell);
			}
		}
	

		var deleteButton = document.createElement("Input");

		
		deleteButton.setAttribute("name", "deleteButton");
		deleteButton.setAttribute("type", "button");
		deleteButton.setAttribute("UserID", info[p].UserID);
		deleteButton.value = "Delete User";


		
		newRow.appendChild(deleteButton);


		document.getElementById("myTable").appendChild(newRow);
	}



	var deleteButtons = document.getElementsByName("deleteButton");

	bindDelete(deleteButtons);

	}
}