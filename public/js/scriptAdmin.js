document.addEventListener("DOMContentLoaded", loadTable);



function loadTable(){

var req = new XMLHttpRequest();

req.open("get", "http://" + window.location.hostname+ "/adminUsers", true);

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
	req.open("GET", "http://" + window.location.hostname+ "/delete-admin-row?UserID=" + theRow, true);
	
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

function bindEdit(theButtons){
	

		
		theButtons.addEventListener("click", function(){
			editRow(theButtons.attributes.userid.value);
			
		});
		 
	
	};


function editRow(theID){
	
	var theRow = document.getElementById(theID);
	var email = theRow.cells[2].innerHTML;
	var fname = theRow.cells[1].innerHTML;
	var lname = theRow.cells[0].innerHTML;
	
	var req = new XMLHttpRequest();
	var data = "UserID=" + theID + "&email=" + email + "&fName=" + fname + "&lName=" + lname;
	req.open("POST", "http://" + window.location.hostname+ "/edit-admin-row", true);

	
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

	req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	req.send(data);
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
	newRow.setAttribute("id", info[p].UserID);
	
	
		for(r in info[p]){
			if(r == "userID" || r == "password" || r == "isAdmin" || r == "UserID" || r == "adminID"){}
			else{
			var newCell = document.createElement("TD");
			if(r != "timeCreated")
			newCell.setAttribute("contenteditable", "true");
			newCell.textContent = info[p][r];
			if(r == "email"){
				newCell.setAttribute("name", "email");
				newCell.setAttribute("email", info[p][r]);
			}
			if(r == "fname"){
				newCell.setAttribute("name", "fname");
				newCell.setAttribute("fname", info[p][r]);
			}
			if(r == "lname"){
				newCell.setAttribute("name", "lname");
				newCell.setAttribute("lname", info[p][r]);
			}
			
			newRow.appendChild(newCell);
			}
		}
		
		var editButton = document.createElement("Input");
		
		editButton.setAttribute("name", "editButton");
		editButton.setAttribute("type", "button");
		editButton.setAttribute("UserID", info[p].UserID);
		editButton.value = "Edit User";

		var deleteButton = document.createElement("Input");

		
		deleteButton.setAttribute("name", "deleteButton");
		deleteButton.setAttribute("type", "button");
		deleteButton.setAttribute("UserID", info[p].UserID);
		deleteButton.value = "Delete User";


		newRow.appendChild(editButton);
		newRow.appendChild(deleteButton);


		document.getElementById("myTable").appendChild(newRow);
		bindEdit(editButton);
	}



	var deleteButtons = document.getElementsByName("deleteButton");

	bindDelete(deleteButtons);


	}
}