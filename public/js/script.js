document.addEventListener("DOMContentLoaded", loadTable);



function loadTable(){

var req = new XMLHttpRequest();

req.open("get", "http://" + window.location.hostname+ "/regUsers", true);


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
	req.open("GET", "http://" + window.location.hostname+ "/delete-row?UserID=" + theRow, true);
	
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
	var email = theRow.cells[4].innerHTML;
	var fname = theRow.cells[3].innerHTML;
	var lname = theRow.cells[2].innerHTML;
	var region = theRow.cells[0].innerHTML;
	
	var req = new XMLHttpRequest();
	var data = "UserID=" + theID + "&email=" + email + "&fName=" + fname + "&lName=" + lname + "&regionID=" + region;
	req.open("POST", "http://" + window.location.hostname+ "/edit-user-row", true);

	
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
			if(r == "userID" || r == "password" || r == "isAdmin" || r == "UserID"){}
			else{
				var newCell = document.createElement("TD");
				if(r == "timeCreated" || r == "signature"){}
				else
					newCell.setAttribute("contenteditable", "true");
				if(r != "signature")
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
				if(r == "regionID"){
					newCell.setAttribute("name", "regionID");
					newCell.setAttribute("regionID", info[p][r]);
				}
				if(r == "signature"){
					var img = document.createElement("img");
					img.src = info[p][r];
					img.alt = "No image URL on file";
					img.style.width = '25%';
					img.style.height = 'auto';
					newCell.appendChild(img);
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