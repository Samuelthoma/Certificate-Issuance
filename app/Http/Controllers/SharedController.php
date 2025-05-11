<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SharedController extends Controller
{
    public function showSharedWithMe(){
        return view('pages.shared');
    }
}
