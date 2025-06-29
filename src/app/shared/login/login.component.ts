import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  showPassword = false;

  constructor() { }

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    // Lógica de login aqui
    console.log('Login submitted');
  }

  loginWithGoogle() {
    // Lógica de login com Google
    console.log('Login with Google');
  }

  loginWithFacebook() {
    // Lógica de login com Facebook
    console.log('Login with Facebook');
  }

  goToSignup() {
    // Navegação para página de cadastro
    console.log('Navigate to signup');
  }

  forgotPassword() {
    // Lógica de esqueci a senha
    console.log('Forgot password');
  }
}
